import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; appId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingDateTime, meetingLink, message } = await request.json();

    if (!meetingDateTime) {
      return NextResponse.json({ error: 'Meeting date and time are required' }, { status: 400 });
    }

    // Verify the project belongs to this business owner and get application details
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', params.appId)
      .eq('project_id', params.id)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (projectError || !project || project.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({
        status: 'interviewScheduled',
        meeting_date_time: meetingDateTime,
        invited_at: new Date().toISOString()
      })
      .eq('id', params.appId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Get additional data for email
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('user_id')
      .eq('user_id', application.student_id)
      .single();

    const { data: student } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', application.student_id)
      .single();

    const { data: projectData } = await supabase
      .from('projects')
      .select('title, owner_id')
      .eq('id', params.id)
      .single();

    const { data: ownerProfile } = await supabase
      .from('business_owner_profiles')
      .select('company_name, user_id')
      .eq('user_id', projectData?.owner_id)
      .single();

    const { data: owner } = await supabase
      .from('users')
      .select('name')
      .eq('id', projectData?.owner_id)
      .single();

    // Send email notification to student
    if (student && projectData && owner && ownerProfile) {
      try {
        await sendEmail({
          to: student.email,
          subject: `Interview Invitation - ${projectData.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #006744;">Congratulations! You've been invited to an interview</h2>
              
              <p>Hi ${student.name},</p>
              
              <p>Great news! ${owner.name} from ${ownerProfile.company_name} would like to schedule an interview with you for the project: <strong>${projectData.title}</strong>.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Meeting Details</h3>
                <p><strong>Date & Time:</strong> ${new Date(meetingDateTime).toLocaleString()}</p>
                ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
                ${message ? `<p><strong>Message from ${owner.name}:</strong></p><p>${message}</p>` : ''}
              </div>
              
              <p>Please log into your G1000 Portal dashboard to view more details and confirm your availability.</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/applications" style="background: #006744; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Application</a>
              
              <p>Best of luck with your interview!</p>
              
              <p>The G1000 Portal Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ data: updatedApplication });
  } catch (error) {
    console.error('Error in POST /api/business/projects/[id]/applications/[appId]/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 