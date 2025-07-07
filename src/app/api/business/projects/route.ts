import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { ProjectForm } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error('Error in GET /api/business/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ProjectForm = await request.json();
    const {
      title,
      description,
      industryTags,
      duration,
      deliverables,
      compensationType,
      compensationValue,
      applyWindowStart,
      applyWindowEnd,
      requiredSkills
    } = body;

    // Validation
    if (!title || !description || !duration || !compensationType || !compensationValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new Date(applyWindowStart) >= new Date(applyWindowEnd)) {
      return NextResponse.json({ error: 'Application window start must be before end date' }, { status: 400 });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        title,
        description,
        industry_tags: industryTags || [],
        duration,
        deliverables: deliverables || [],
        compensation_type: compensationType,
        compensation_value: compensationValue,
        apply_window_start: applyWindowStart,
        apply_window_end: applyWindowEnd,
        required_skills: requiredSkills || [],
        status: 'open'
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/business/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 