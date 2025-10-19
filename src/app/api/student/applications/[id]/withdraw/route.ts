import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let user;

    // In dev mode, create mock student user for student context
    if (process.env.DEV_MODE === 'true') {
      const referer = request.headers.get('referer') || '';
      const pathname = new URL(request.url).pathname;

      // For student API routes, always use student context in dev mode
      if (pathname.startsWith('/api/student') || referer.includes('/student')) {
        user = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'dev-student@example.com',
          name: 'Dev Student',
          role: 'student' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    }

    // Normal auth flow for production
    if (!user) {
      user = await getUserFromRequest(request);
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if application exists and belongs to the user
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, student_id, status')
      .eq('id', params.id)
      .eq('student_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Check if application can be withdrawn
    if (application.status === 'withdrawn') {
      return NextResponse.json({ error: 'Application already withdrawn' }, { status: 400 });
    }

    if (application.status === 'accepted' || application.status === 'interviewScheduled') {
      return NextResponse.json({
        error: 'Cannot withdraw application after interview has been scheduled or accepted'
      }, { status: 400 });
    }

    // Update application status to withdrawn
    const { data: updatedApplication, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        status: 'withdrawn',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error withdrawing application:', updateError);
      return NextResponse.json({ error: 'Failed to withdraw application' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: updatedApplication.id,
        status: updatedApplication.status,
        message: 'Application withdrawn successfully'
      }
    });
  } catch (error) {
    console.error('Error in withdraw application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}