import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get applications with project and business owner details
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        project:projects(
          id,
          title,
          description,
          industry_tags,
          duration,
          compensation_type,
          compensation_value,
          owner:business_owner_profiles(
            company_name,
            website_url
          )
        )
      `)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false });

    if (applicationsError) {
      console.error('Applications fetch error:', applicationsError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
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
      reflectionOwner: app.reflection_owner,
      reflectionStudent: app.reflection_student,
      project: app.project ? {
        id: app.project.id,
        title: app.project.title,
        description: app.project.description,
        industryTags: app.project.industry_tags,
        duration: app.project.duration,
        compensationType: app.project.compensation_type,
        compensationValue: app.project.compensation_value,
        owner: app.project.owner ? {
          companyName: app.project.owner.company_name,
          websiteUrl: app.project.owner.website_url
        } : null
      } : null
    }));

    return NextResponse.json({ data: formattedApplications });
  } catch (error) {
    console.error('Student applications fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 