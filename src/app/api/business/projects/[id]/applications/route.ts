import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the project belongs to this business owner
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get applications for this project
    const { data: applications, error } = await supabase
      .from('applications')
      .select('*')
      .eq('project_id', params.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error('Error in GET /api/business/projects/[id]/applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 