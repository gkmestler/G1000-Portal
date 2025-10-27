// Edge-compatible auth functions (no bcryptjs)
import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';
import { supabaseAdmin } from './supabase';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-characters-long!!!'
);

interface JWTPayload extends JoseJWTPayload {
  userId: string;
  email: string;
  role: 'student' | 'owner' | 'admin';
}

function createMockUser(userType: 'student' | 'owner' | 'admin') {
  switch (userType) {
    case 'owner':
      return {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'dev-owner@example.com',
        name: 'Dev Business Owner',
        role: 'owner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        businessProfile: {
          companyName: 'Dev Company',
          website: 'https://example.com',
          companySize: '11-50',
          industry: 'Technology'
        }
      };
    case 'admin':
      return {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'dev-admin@example.com',
        name: 'Dev Admin',
        role: 'admin' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    default:
      return {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'dev-student@example.com',
        name: 'Dev Student',
        role: 'student' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
  }
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'student' | 'owner' | 'admin',
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try to get token from cookies
  const token = request.cookies.get('auth-token')?.value;
  return token || null;
}

export async function getUserFromRequest(request: NextRequest) {
  // Check if we're in dev mode first
  if (process.env.DEV_MODE === 'true') {
    // Determine user type based on URL path, referer, and headers
    const url = request.url || '';
    const referer = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const combinedContext = `${url} ${referer}`;

    let userType: 'student' | 'owner' | 'admin' = 'student'; // default to student for better UX

    // Check for explicit dev role header first (set by middleware)
    const devRole = request.headers.get('x-dev-role');
    if (devRole && ['student', 'owner', 'admin'].includes(devRole)) {
      userType = devRole as 'student' | 'owner' | 'admin';
    }
    // Check for business context
    else if (combinedContext.includes('/business') || combinedContext.includes('/api/business')) {
      userType = 'owner';
    }
    // Check for admin context
    else if (combinedContext.includes('/admin') || combinedContext.includes('/api/admin')) {
      userType = 'admin';
    }
    // Keep student as default for /student routes and general browsing
    else if (combinedContext.includes('/student') || combinedContext.includes('/api/student') || !referer) {
      userType = 'student';
    }

    console.log(`🔧 Dev Mode: Creating mock ${userType} user (context: ${url}, referer: ${referer})`);

    const mockUser = createMockUser(userType);

    // Ensure mock user exists in database
    try {
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', mockUser.id)
        .single();

      if (fetchError || !existingUser) {
        console.log(`🔧 Dev Mode: Inserting mock ${userType} user into database`);

        // Insert the mock user into the database
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            role: mockUser.role,
            created_at: mockUser.created_at,
            updated_at: mockUser.updated_at
          });

        if (insertError) {
          console.error('Error inserting mock user:', insertError);
        }

        // For business owners, also create the business profile
        if (userType === 'owner') {
          const ownerUser = mockUser as any; // Type assertion for mock data
          if (ownerUser.businessProfile) {
            const { error: profileError } = await supabaseAdmin
              .from('business_owner_profiles')
              .upsert({
                user_id: mockUser.id,
                company_name: ownerUser.businessProfile.companyName,
                website: ownerUser.businessProfile.website,
                company_size: ownerUser.businessProfile.companySize,
                industry: ownerUser.businessProfile.industry,
                created_at: mockUser.created_at,
                updated_at: mockUser.updated_at
              });

            if (profileError) {
              console.error('Error inserting mock business profile:', profileError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking/creating mock user:', error);
    }

    return mockUser;
  }

  // Normal authentication flow
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Get full user data from database
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .single();

  if (error || !user) return null;

  return user;
}