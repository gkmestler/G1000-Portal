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

    const body = await request.json();
    const { coverNote, proofOfWorkUrl } = body;

    // Validate input
    if (!coverNote || !coverNote.trim()) {
      return NextResponse.json({ error: 'Cover note is required' }, { status: 400 });
    }

    if (!proofOfWorkUrl || !proofOfWorkUrl.trim()) {
      return NextResponse.json({ error: 'Proof of work URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(proofOfWorkUrl);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid proof of work URL format' }, { status: 400 });
    }

    // Check if project exists and is open for applications
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, status, apply_window_start, apply_window_end')
      .eq('id', params.id)
      .eq('status', 'open')
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      console.error('Project check error:', projectError);
      return NextResponse.json({ error: 'Failed to verify project' }, { status: 500 });
    }

    // Check if application window is open
    const now = new Date();
    const windowStart = new Date(project.apply_window_start);
    const windowEnd = new Date(project.apply_window_end);

    if (now < windowStart || now > windowEnd) {
      return NextResponse.json({ error: 'Application window is closed' }, { status: 400 });
    }

    // Check if student has already applied
    const { data: existingApplication } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('project_id', params.id)
      .eq('student_id', user.id)
      .single();

    if (existingApplication) {
      return NextResponse.json({ error: 'You have already applied to this project' }, { status: 409 });
    }

    // Create application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .insert({
        project_id: params.id,
        student_id: user.id,
        cover_note: coverNote.trim(),
        proof_of_work_url: proofOfWorkUrl.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (applicationError) {
      console.error('Application creation error:', applicationError);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: application.id,
        projectId: application.project_id,
        studentId: application.student_id,
        coverNote: application.cover_note,
        proofOfWorkUrl: application.proof_of_work_url,
        status: application.status,
        submittedAt: application.submitted_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 