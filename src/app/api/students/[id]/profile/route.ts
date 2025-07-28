import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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
      if (pathname.startsWith('/api/students') || referer.includes('/business')) {
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

    // Verify that this business owner has a legitimate reason to view this student profile
    // (i.e., the student has applied to one of their projects)
    const { data: hasApplication, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('student_id', params.id)
      .in('project_id', 
        await supabaseAdmin
          .from('projects')
          .select('id')
          .eq('owner_id', user.id)
          .then(result => result.data?.map(p => p.id) || [])
      )
      .limit(1);

    if (applicationError) {
      console.error('Application check error:', applicationError);
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
    }

    if (!hasApplication || hasApplication.length === 0) {
      return NextResponse.json({ error: 'No access to this student profile' }, { status: 403 });
    }

    // Get student user data
    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, created_at')
      .eq('id', params.id)
      .eq('role', 'student')
      .single();

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      console.error('Student fetch error:', studentError);
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
    }

    // Get student profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .select('*')
      .eq('user_id', params.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // Student exists but no profile yet
        return NextResponse.json({
          data: {
            user: {
              id: student.id,
              name: student.name,
              email: student.email,
              role: 'student',
              createdAt: student.created_at
            },
            profile: null
          }
        });
      }
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        user: {
          id: student.id,
          name: student.name,
          email: student.email,
          role: 'student',
          createdAt: student.created_at
        },
        profile: {
          userId: profile.user_id,
          bio: profile.bio,
          major: profile.major,
          year: profile.year,
          linkedinUrl: profile.linkedin_url,
          githubUrl: profile.github_url,
          personalWebsiteUrl: profile.personal_website_url,
          resumeUrl: profile.resume_url,
          skills: profile.skills || [],
          proofOfWorkUrls: profile.proof_of_work_urls || [],
          availableDays: profile.available_days || [],
          availableStartTime: profile.available_start_time,
          availableEndTime: profile.available_end_time,
          timezone: profile.timezone || 'America/New_York',
          updatedAt: profile.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Student profile view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 