import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { ProjectForm } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // In dev mode, create mock owner user for business context
    if (process.env.DEV_MODE === 'true') {
      const referer = request.headers.get('referer') || '';
      const pathname = new URL(request.url).pathname;
      
      // For business API routes, always use owner context in dev mode
      if (pathname.startsWith('/api/business') || referer.includes('/business')) {
        const mockOwnerUser = {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'dev-owner@example.com',
          name: 'Dev Business Owner',
          role: 'owner' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: projects, error } = await supabaseAdmin
          .from('projects')
          .select(`
            *,
            applications(
              id,
              status,
              submitted_at,
              invited_at,
              rejected_at
            )
          `)
          .eq('owner_id', mockOwnerUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
        }

        return NextResponse.json({ data: projects });
      }
    }
    
    // Normal auth flow for production
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        applications(
          id,
          status,
          submitted_at,
          invited_at,
          rejected_at
        )
      `)
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

    const body: ProjectForm = await request.json();
    const {
      title,
      description,
      type,
      typeExplanation,
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
    if (!title || !description || !type || !duration || !compensationType || !compensationValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'other' && !typeExplanation?.trim()) {
      return NextResponse.json({ error: 'Type explanation is required when type is "other"' }, { status: 400 });
    }

    if (!industryTags || industryTags.length === 0) {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
    }

    if (new Date(applyWindowStart) >= new Date(applyWindowEnd)) {
      return NextResponse.json({ error: 'Application window start must be before end date' }, { status: 400 });
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        owner_id: user.id,
        title,
        description,
        type,
        type_explanation: typeExplanation,
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