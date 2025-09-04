import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const industry = url.searchParams.get('industry');
    const skills = url.searchParams.get('skills');
    const compensationType = url.searchParams.get('compensationType');
    const duration = url.searchParams.get('duration');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '10');

    let query = supabaseAdmin
      .from('projects')
      .select('*')
      .eq('status', 'open');

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (industry) {
      const industries = industry.split(',');
      query = query.overlaps('industry_tags', industries);
    }

    if (skills) {
      const skillsList = skills.split(',');
      query = query.overlaps('required_skills', skillsList);
    }

    if (compensationType) {
      const types = compensationType.split(',');
      query = query.in('compensation_type', types);
    }

    if (duration) {
      const durations = duration.split(',');
      query = query.in('duration', durations);
    }

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    const { data: projects, error: projectsError, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Projects fetch error:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
    }

    const formattedProjects = projects.map(project => ({
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
    }));

    return NextResponse.json({
      data: formattedProjects,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    });
  } catch (error) {
    console.error('Opportunities fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 