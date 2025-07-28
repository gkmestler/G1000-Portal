import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .eq('status', 'open')
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
      }
      console.error('Project fetch error:', projectError);
      return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 });
    }

    const formattedProject = {
      id: project.id,
      ownerId: project.owner_id,
      title: project.title,
      description: project.description,
      type: project.type,
      typeExplanation: project.type_explanation,
      industryTags: project.industry_tags || [],
      duration: project.duration,
      deliverables: project.deliverables || [],
      compensationType: project.compensation_type,
      compensationValue: project.compensation_value,
      applyWindowStart: project.apply_window_start,
      applyWindowEnd: project.apply_window_end,
      requiredSkills: project.required_skills || [],
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      owner: {
        companyName: 'Business Owner',
        websiteUrl: null,
        isApproved: true,
        user: {
          name: 'Business Owner',
          email: 'owner@example.com'
        }
      }
    };

    return NextResponse.json({ data: formattedProject });
  } catch (error) {
    console.error('Opportunity fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 