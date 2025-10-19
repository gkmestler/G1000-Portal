import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; appId: string } }
) {
  try {
    console.log('Accept endpoint called with params:', params);
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

    const body = await request.json();
    const { message } = body;
    console.log('Request body:', body);

    // Verify the project belongs to this business owner and get application details
    console.log('Fetching application:', params.appId);
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', params.appId)
      .eq('project_id', params.id)
      .single();

    if (applicationError) {
      console.error('Error fetching application:', applicationError);
      return NextResponse.json({ error: 'Application not found', details: applicationError }, { status: 404 });
    }

    if (!application) {
      console.error('Application not found');
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    console.log('Application found:', application);

    // Verify project ownership
    console.log('Fetching project:', params.id);
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ error: 'Project not found', details: projectError }, { status: 404 });
    }

    if (!project) {
      console.error('Project not found');
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== user.id) {
      console.error('Unauthorized: project owner mismatch', { projectOwnerId: project.owner_id, userId: user.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Project found and authorized:', project);

    // Start a transaction to accept the application and close the project
    // Update the accepted application
    console.log('Updating application status to accepted...');

    // Try with updated_at first, fallback to without it if it fails
    let acceptedApplication;
    let acceptError;

    try {
      const result = await supabaseAdmin
        .from('applications')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.appId)
        .select('*')
        .single();

      acceptedApplication = result.data;
      acceptError = result.error;
    } catch (err) {
      console.log('Failed with updated_at field, trying without it...');
      const result = await supabaseAdmin
        .from('applications')
        .update({
          status: 'accepted'
        })
        .eq('id', params.appId)
        .select('*')
        .single();

      acceptedApplication = result.data;
      acceptError = result.error;
    }

    if (acceptError) {
      console.error('Error accepting application:', acceptError);
      return NextResponse.json({ error: 'Failed to accept application', details: acceptError }, { status: 500 });
    }

    console.log('Application accepted successfully:', acceptedApplication);

    // Update the project status to closed (with fallback if column doesn't exist)
    try {
      console.log('Attempting to update project status to closed...');

      // Try with both status and updated_at
      let projectUpdateResult = await supabaseAdmin
        .from('projects')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (projectUpdateResult.error) {
        console.log('Failed with status and updated_at, trying just updated_at...');
        // Try with just updated_at if status field doesn't exist
        projectUpdateResult = await supabaseAdmin
          .from('projects')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', params.id);

        if (projectUpdateResult.error) {
          console.warn('Warning: Could not update project at all:', projectUpdateResult.error);
          // Continue without failing
        }
      }

      console.log('Project update completed');
    } catch (error) {
      console.error('Warning: Could not update project status:', error);
      // Continue without failing
    }

    // Get all other pending applications to reject them
    const { data: otherApplications, error: otherAppsError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('project_id', params.id)
      .neq('id', params.appId)
      .in('status', ['submitted', 'underReview', 'interviewScheduled']);

    if (otherAppsError) {
      console.error('Error fetching other applications:', otherAppsError);
    }

    // Reject all other pending applications
    if (otherApplications && otherApplications.length > 0) {
      const { error: rejectError } = await supabaseAdmin
        .from('applications')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          reflection_owner: 'Another candidate was selected for this opportunity.'
        })
        .eq('project_id', params.id)
        .neq('id', params.appId)
        .in('status', ['submitted', 'underReview', 'interviewScheduled']);

      if (rejectError) {
        console.error('Error rejecting other applications:', rejectError);
      }
    }

    // Get data for email notifications
    const { data: acceptedStudent } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', application.student_id)
      .single();

    const { data: ownerProfile } = await supabaseAdmin
      .from('business_owner_profiles')
      .select('company_name, user_id')
      .eq('user_id', project.owner_id)
      .single();

    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', project.owner_id)
      .single();

    // Send acceptance email to the selected student
    if (acceptedStudent && project && owner && ownerProfile) {
      try {
        await sendEmail({
          to: acceptedStudent.email,
          subject: `Congratulations! You've been selected for ${project.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #006744;">Congratulations! 🎉</h2>

              <p>Hi ${acceptedStudent.name},</p>

              <p>Great news! You have been selected for the project: <strong>${project.title}</strong> at ${ownerProfile.company_name}.</p>

              ${message ? `
                <div style="background: #f0f9f4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #006744;">
                  <h3 style="margin-top: 0; color: #006744;">Message from ${owner.name}</h3>
                  <p>${message}</p>
                </div>
              ` : ''}

              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>The business owner will reach out to you soon with more details</li>
                <li>Please check your email regularly for further communication</li>
                <li>If you have any questions, feel free to reply to this email</li>
              </ul>

              <p><strong>Business Contact:</strong> ${owner.email}</p>

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/applications" style="background: #006744; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Your Applications</a>

              <p>Congratulations once again on this achievement!</p>

              <p>Best regards,<br>The G1000 Portal Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Error sending acceptance email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Send rejection emails to other applicants
    if (otherApplications && otherApplications.length > 0) {
      for (const otherApp of otherApplications) {
        const { data: student } = await supabaseAdmin
          .from('users')
          .select('name, email')
          .eq('id', otherApp.student_id)
          .single();

        if (student) {
          try {
            await sendEmail({
              to: student.email,
              subject: `Application Update - ${project.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #006744;">Application Update</h2>

                  <p>Hi ${student.name},</p>

                  <p>Thank you for your interest in the project: <strong>${project.title}</strong> at ${ownerProfile?.company_name}.</p>

                  <p>We wanted to inform you that we have selected another candidate for this opportunity. We appreciate the time and effort you put into your application.</p>

                  <p>Please don't be discouraged - there are many exciting opportunities on the G1000 Portal. We encourage you to continue exploring and applying to projects that match your skills and interests.</p>

                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/opportunities" style="background: #006744; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Explore More Opportunities</a>

                  <p>Best of luck with your future applications!</p>

                  <p>The G1000 Portal Team</p>
                </div>
              `
            });
          } catch (emailError) {
            console.error('Error sending rejection email:', emailError);
            // Continue with other emails even if one fails
          }
        }
      }
    }

    return NextResponse.json({ data: acceptedApplication });
  } catch (error: any) {
    console.error('Error in POST /api/business/projects/[id]/applications/[appId]/accept:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || error,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}