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

    const { reason } = await request.json();

    // Verify the project belongs to this business owner and get application details
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select(`
        *,
        student:student_profiles(
          userId,
          user:users(id, name, email)
        ),
        project:projects(
          id,
          title,
          ownerId,
          owner:business_owner_profiles(
            companyName,
            user:users(id, name, email)
          )
        )
      `)
      .eq('id', params.appId)
      .eq('projectId', params.id)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.project.ownerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        reflection_owner: reason || null
      })
      .eq('id', params.appId)
      .select(`
        *,
        student:student_profiles(
          userId,
          user:users(id, name, email)
        ),
        project:projects(
          id,
          title,
          owner:business_owner_profiles(
            companyName,
            user:users(id, name, email)
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Send email notification to student
    try {
      await sendEmail({
        to: application.student.user.email,
        subject: `Application Update - ${application.project.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #006744;">Application Update</h2>
            
            <p>Hi ${application.student.user.name},</p>
            
            <p>Thank you for your interest in the project: <strong>${application.project.title}</strong> at ${application.project.owner.companyName}.</p>
            
            <p>After careful consideration, we have decided to move forward with other candidates for this particular opportunity.</p>
            
            ${reason ? `
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Feedback</h3>
                <p>${reason}</p>
              </div>
            ` : ''}
            
            <p>Please don't be discouraged - there are many exciting opportunities on the G1000 Portal. We encourage you to continue exploring and applying to projects that match your skills and interests.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/opportunities" style="background: #006744; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Explore More Opportunities</a>
            
            <p>Best of luck with your future applications!</p>
            
            <p>The G1000 Portal Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ data: updatedApplication });
  } catch (error) {
    console.error('Error in POST /api/business/projects/[id]/applications/[appId]/reject:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 