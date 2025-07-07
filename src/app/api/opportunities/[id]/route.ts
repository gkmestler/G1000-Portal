import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        owner:business_owner_profiles!inner(
          company_name,
          website_url,
          user:users!inner(
            name,
            email
          )
        )
      `)
      .eq('id', params.id)
      .eq('status', 'open')
      .eq('owner.is_approved', true)
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
      owner: project.owner ? {
        companyName: project.owner.company_name,
        websiteUrl: project.owner.website_url,
        user: project.owner.user ? {
          name: project.owner.user.name,
          email: project.owner.user.email
        } : null
      } : null
    };

    return NextResponse.json({ data: formattedProject });
  } catch (error) {
    console.error('Opportunity fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 