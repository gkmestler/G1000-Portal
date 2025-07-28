import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // In dev mode, check the referer to determine user type
    if (process.env.DEV_MODE === 'true') {
      const referer = request.headers.get('referer') || '';
      
      let userType: 'student' | 'owner' | 'admin' = 'student';
      
      if (referer.includes('/business')) {
        userType = 'owner';
      } else if (referer.includes('/admin')) {
        userType = 'admin';
      }
      
      // Create and return mock user based on context
      const mockUser = {
        student: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'dev-student@example.com',
          name: 'Dev Student',
          role: 'student' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        owner: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'dev-owner@example.com',
          name: 'Dev Business Owner',
          role: 'owner' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          businessProfile: {
            companyName: 'Dev Company Inc.',
            isApproved: true
          }
        },
        admin: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          email: 'dev-admin@example.com',
          name: 'Dev Admin',
          role: 'admin' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
      
      const user = mockUser[userType];
      
      return NextResponse.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          businessProfile: (user as any).businessProfile
        }
      });
    }
    
    // Normal auth flow for production
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If business owner, get their profile
    let businessProfile = null;
    if (user.role === 'owner') {
      const { data: profile } = await supabaseAdmin
        .from('business_owner_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Transform snake_case to camelCase for frontend
      if (profile) {
        businessProfile = {
          companyName: profile.company_name,
          isApproved: profile.is_approved,
          industryTags: profile.industry_tags,
          websiteUrl: profile.website_url,
          companyDescription: profile.company_description,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        };
      }
    }

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        businessProfile
      }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 