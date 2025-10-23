import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { ProjectForm } from '@/types';

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

    const { id: applicationId } = params;

    // Get project details with all related data
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        projects!inner(
          id,
          title,
          description,
          owner_id,
          industry_tags,
          estimated_duration,
          compensation_type,
          compensation_value
        ),
        users(
          id,
          name,
          email
        ),
        project_overviews(
          id,
          scope,
          deliverables,
          start_date,
          target_end_date,
          meeting_link,
          owner_contact_name,
          owner_contact_email,
          useful_links,
          updated_at
        ),
        project_reviews(
          id,
          reliability_rating,
          communication_rating,
          initiative_rating,
          quality_rating,
          impact_rating,
          review_note,
          deliverables_completed,
          created_at
        ),
        project_reflections(
          id,
          reflection_points,
          reflection_links,
          created_at
        )
      `)
      .eq('id', applicationId)
      .eq('projects.owner_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all updates with comments
    const { data: updates } = await supabaseAdmin
      .from('project_updates')
      .select(`
        *,
        project_comments(
          id,
          user_id,
          comment,
          created_at,
          users(name, role)
        )
      `)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    const formattedProject = {
      id: application.id,
      title: application.projects?.title || 'Untitled Project',
      description: application.projects?.description,
      studentName: application.users?.name || 'Unknown Student',
      studentEmail: application.users?.email || '',
      studentId: application.student_id,
      status: application.project_reviews?.length > 0 ? 'completed' : 'active',

      // Overview section
      overview: {
        id: application.project_overviews?.[0]?.id,
        scope: application.project_overviews?.[0]?.scope || '',
        deliverables: application.project_overviews?.[0]?.deliverables || [],
        startDate: application.project_overviews?.[0]?.start_date,
        targetEndDate: application.project_overviews?.[0]?.target_end_date,
        meetingLink: application.project_overviews?.[0]?.meeting_link || '',
        ownerContactName: application.project_overviews?.[0]?.owner_contact_name || '',
        ownerContactEmail: application.project_overviews?.[0]?.owner_contact_email || '',
        usefulLinks: application.project_overviews?.[0]?.useful_links || [],
        updatedAt: application.project_overviews?.[0]?.updated_at
      },

      // Updates section
      updates: updates?.map(update => ({
        id: update.id,
        workedOn: update.worked_on,
        progressPercentage: update.progress_percentage,
        blockers: update.blockers,
        nextSteps: update.next_steps || [],
        links: update.links || [],
        createdAt: update.created_at,
        comments: update.project_comments?.map((comment: any) => ({
          id: comment.id,
          userId: comment.user_id,
          userName: comment.users?.name,
          userRole: comment.users?.role,
          comment: comment.comment,
          createdAt: comment.created_at
        })) || []
      })) || [],

      // Review section (if completed)
      review: application.project_reviews?.[0] ? {
        id: application.project_reviews[0].id,
        reliabilityRating: application.project_reviews[0].reliability_rating,
        communicationRating: application.project_reviews[0].communication_rating,
        initiativeRating: application.project_reviews[0].initiative_rating,
        qualityRating: application.project_reviews[0].quality_rating,
        impactRating: application.project_reviews[0].impact_rating,
        reviewNote: application.project_reviews[0].review_note,
        deliverablesCompleted: application.project_reviews[0].deliverables_completed,
        createdAt: application.project_reviews[0].created_at
      } : null,

      // Reflection section (if exists)
      reflection: application.project_reflections?.[0] ? {
        id: application.project_reflections[0].id,
        reflectionPoints: application.project_reflections[0].reflection_points || [],
        reflectionLinks: application.project_reflections[0].reflection_links || [],
        createdAt: application.project_reflections[0].created_at
      } : null,

      ownerId: user.id,
      projectId: application.project_id
    };

    return NextResponse.json({ data: formattedProject });
  } catch (error) {
    console.error('Error in GET /api/business/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user || user.role !== 'owner') {
      console.error('Authentication failed - User:', user);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    const body = await request.json();
    const {
      title,
      description,
      type,
      typeExplanation,
      industryTags,
      duration,
      estimatedDuration,
      estimatedHoursPerWeek,
      deliverables,
      compensationType,
      compensationValue,
      budget,
      location,
      onsiteLocation,
      applyWindowStart,
      applyWindowEnd,
      requiredSkills,
      isAiConsultation,
      currentSoftwareTools,
      painPoints
    } = body;

    // Validation - only require core fields, others are optional
    if (!isAiConsultation) {
      if (!title || !description || !type) {
        return NextResponse.json({ error: 'Missing required fields: title, description, or type' }, { status: 400 });
      }
    } else {
      if (!currentSoftwareTools?.trim()) {
        return NextResponse.json({ error: 'Current software and tools description is required for AI consultation' }, { status: 400 });
      }
    }

    if (!industryTags || industryTags.length === 0) {
      return NextResponse.json({ error: 'At least one industry tag is required' }, { status: 400 });
    }

    if (!applyWindowStart || !applyWindowEnd) {
      return NextResponse.json({ error: 'Application window dates are required' }, { status: 400 });
    }

    if (type === 'other' && !typeExplanation?.trim()) {
      return NextResponse.json({ error: 'Type explanation is required when type is "other"' }, { status: 400 });
    }

    if (new Date(applyWindowStart) >= new Date(applyWindowEnd)) {
      return NextResponse.json({ error: 'Application window start must be before end date' }, { status: 400 });
    }

    // Handle compensation fields - ensure compensation_value is never null
    let finalCompensationType = compensationType || 'experience';
    let finalCompensationValue = compensationValue;

    console.log('Compensation handling:', {
      inputType: compensationType,
      inputValue: compensationValue,
      finalType: finalCompensationType,
      initialFinalValue: finalCompensationValue
    });

    // Always provide a default value based on compensation type
    if (!finalCompensationValue || finalCompensationValue === null || finalCompensationValue === '') {
      if (finalCompensationType === 'experience') {
        finalCompensationValue = 'Portfolio/Experience Building';
      } else if (finalCompensationType === 'stipend') {
        finalCompensationValue = 'Stipend Available';
      } else if (finalCompensationType === 'hourly') {
        finalCompensationValue = 'Hourly Compensation';
      } else {
        finalCompensationValue = 'To Be Discussed';
      }
    }

    console.log('Final compensation value:', finalCompensationValue);

    const updateData = {
      title: isAiConsultation && !title ? 'AI Solutions Consultation' : title,
      description: isAiConsultation && !description ?
        'Looking for a student to consult on where AI solutions could provide the most value in our business operations.' :
        description,
      type: isAiConsultation ? 'consulting' : type,
      type_explanation: typeExplanation,
      is_ai_consultation: isAiConsultation || false,
      current_software_tools: currentSoftwareTools || null,
      pain_points: painPoints || null,
      industry_tags: industryTags || [],
      estimated_duration: duration || estimatedDuration || null,
      estimated_hours_per_week: estimatedHoursPerWeek || null,
      deliverables: deliverables || [],
      compensation_type: finalCompensationType,
      compensation_value: finalCompensationValue,
      budget: budget || null,
      location: location || 'remote',
      onsite_location: onsiteLocation || null,
      apply_window_start: applyWindowStart,
      apply_window_end: applyWindowEnd,
      required_skills: requiredSkills || [],
      updated_at: new Date().toISOString()
    };

    // First, verify the project exists and belongs to the user
    const { data: existingProject, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.owner_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this project' }, { status: 403 });
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error in PUT /api/business/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', params.id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/business/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 