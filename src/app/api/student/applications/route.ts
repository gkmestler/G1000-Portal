import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Get applications with project details
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        projects(
          id,
          title,
          description,
          industry_tags,
          estimated_duration,
          compensation_type,
          compensation_value,
          owner_id
        )
      `)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false });

    if (applicationsError) {
      console.error('Applications fetch error:', applicationsError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Get unique owner IDs
    const ownerIds = [...new Set(applications
      .filter(app => app.projects?.owner_id)
      .map(app => app.projects.owner_id))];

    // Fetch business owner profiles for all owners
    let ownerProfiles: Record<string, { companyName: string; logoUrl: string | null }> = {};
    if (ownerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('business_owner_profiles')
        .select('user_id, company_name, logo_url')
        .in('user_id', ownerIds);

      if (!profilesError && profiles) {
        ownerProfiles = profiles.reduce((acc, profile) => {
          acc[profile.user_id] = {
            companyName: profile.company_name,
            logoUrl: profile.logo_url
          };
          return acc;
        }, {} as Record<string, { companyName: string; logoUrl: string | null }>);
      }
    }

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
      meetingLink: app.meeting_link,
      reflectionOwner: app.reflection_owner,
      reflectionStudent: app.reflection_student,
      project: app.projects ? {
        id: app.projects.id,
        title: app.projects.title,
        description: app.projects.description,
        industryTags: app.projects.industry_tags,
        duration: app.projects.estimated_duration,
        compensationType: app.projects.compensation_type,
        compensationValue: app.projects.compensation_value,
        ownerId: app.projects.owner_id,
        companyName: ownerProfiles[app.projects.owner_id]?.companyName || 'Unknown Company',
        companyLogoUrl: ownerProfiles[app.projects.owner_id]?.logoUrl || null
      } : null
    }));

    return NextResponse.json({ data: formattedApplications });
  } catch (error) {
    console.error('Student applications fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 