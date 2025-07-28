import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let user;
    
    // In dev mode, create mock owner user for business context
    if (process.env.DEV_MODE === 'true') {
      const referer = request.headers.get('referer') || '';
      const pathname = new URL(request.url).pathname;
      
      // For business API routes, always use owner context in dev mode
      if (pathname.startsWith('/api/business') || referer.includes('/business')) {
        user = {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'dev-owner@example.com',
          name: 'Dev Business Owner',
          role: 'owner' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    }
    
    // Normal auth flow for production
    if (!user) {
      user = await getUserFromRequest(request);
    }
    
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the project belongs to this business owner
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get applications for this project with student details
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        users(
          id,
          name,
          email
        )
      `)
      .eq('project_id', params.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Format the applications to include student details
    const formattedApplications = applications.map(app => ({
      id: app.id,
      projectId: app.project_id,
      studentId: app.student_id,
      coverNote: app.cover_note,
      proofOfWorkUrl: app.proof_of_work_url,
      status: app.status,
      submittedAt: app.submitted_at,
      invitedAt: app.invited_at,
      rejectedAt: app.rejected_at,
      meetingDateTime: app.meeting_date_time,
      reflectionOwner: app.reflection_owner,
      reflectionStudent: app.reflection_student,
      student: app.users ? {
        id: app.users.id,
        name: app.users.name,
        email: app.users.email
      } : null
    }));

    return NextResponse.json({ data: formattedApplications });
  } catch (error) {
    console.error('Error in GET /api/business/projects/[id]/applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 