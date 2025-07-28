import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { toISOString } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; appId: string } }
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

    const { meetingDateTime, meetingLink, message } = await request.json();

    if (!meetingDateTime) {
      return NextResponse.json({ error: 'Meeting date and time are required' }, { status: 400 });
    }

    // Verify the project belongs to this business owner and get application details
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', params.appId)
      .eq('project_id', params.id)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (projectError || !project || project.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if application has a scheduled interview
    if (application.status !== 'interviewScheduled') {
      return NextResponse.json({ error: 'No interview scheduled for this application' }, { status: 400 });
    }

    // Store the old meeting time for email notification
    const oldMeetingDateTime = application.meeting_date_time;

    // Update application with new meeting time
    const { data: updatedApplication, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        meeting_date_time: toISOString(meetingDateTime),
        invited_at: new Date().toISOString() // Update the invitation timestamp
      })
      .eq('id', params.appId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Get additional data for email
    const { data: student } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', application.student_id)
      .single();

    const { data: projectData } = await supabaseAdmin
      .from('projects')
      .select('title, owner_id')
      .eq('id', params.id)
      .single();

    const { data: ownerProfile } = await supabaseAdmin
      .from('business_owner_profiles')
      .select('company_name, user_id')
      .eq('user_id', projectData?.owner_id)
      .single();

    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', projectData?.owner_id)
      .single();

    // Send email notification to student about the reschedule
    if (student && projectData && owner && ownerProfile) {
      try {
        await sendEmail({
          to: student.email,
          subject: `Interview Rescheduled - ${projectData.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #006744;">Interview Time Updated</h2>
              
              <p>Hi ${student.name},</p>
              
              <p>${owner.name} from ${ownerProfile.company_name} has updated the time for your interview for the project: <strong>${projectData.title}</strong>.</p>
              
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0; color: #92400e;">Meeting Time Change</h3>
                <p style="margin: 10px 0; color: #78350f;"><strong>Previous Time:</strong> ${oldMeetingDateTime ? new Date(oldMeetingDateTime).toLocaleString() : 'Not specified'}</p>
                <p style="margin: 10px 0; color: #78350f;"><strong>New Time:</strong> ${new Date(toISOString(meetingDateTime)).toLocaleString()}</p>
                ${meetingLink ? `<p style="margin: 10px 0; color: #78350f;"><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #d97706;">${meetingLink}</a></p>` : ''}
              </div>
              
              ${message ? `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Message from ${owner.name}:</h3>
                  <p style="margin-bottom: 0;">${message}</p>
                </div>
              ` : ''}
              
              <p>Please update your calendar with the new meeting time. We apologize for any inconvenience this may cause.</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/applications" style="background: #006744; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Updated Interview Details</a>
              
              <p>Looking forward to the interview!</p>
              
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
    console.error('Error in POST /api/business/projects/[id]/applications/[appId]/reschedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 