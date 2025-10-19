import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; applicationId: string } }
) {
  try {
    // Get current user - in production, verify from session/JWT
    let currentUserId: string | null = null;
    const authHeader = request.headers.get('authorization');

    // In dev mode, use mock owner ID
    if (process.env.DEV_MODE === 'true') {
      currentUserId = '660e8400-e29b-41d4-a716-446655440001'; // Mock owner ID
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { meetingLink } = await request.json();

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .eq('id', params.id)
      .eq('owner_id', currentUserId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // Verify application exists and is in interviewScheduled status
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, status')
      .eq('id', params.applicationId)
      .eq('project_id', params.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'interviewScheduled') {
      return NextResponse.json({
        error: 'Meeting link can only be added to scheduled interviews'
      }, { status: 400 });
    }

    // Update the meeting link
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        meeting_link: meetingLink || null
      })
      .eq('id', params.applicationId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update meeting link' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting link updated successfully'
    });

  } catch (error) {
    console.error('Meeting link update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}