import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';
import bcrypt from 'bcryptjs';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-for-development-only');

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'student' | 'owner' | 'admin';
  iat: number;
  exp: number;
}

// Mock user data for dev mode
const createMockUser = (role: 'student' | 'owner' | 'admin') => {
  const mockUsers = {
    student: {
      id: 'dev-student-id',
      email: 'dev-student@example.com',
      name: 'Dev Student',
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    owner: {
      id: 'dev-owner-id',
      email: 'dev-owner@example.com',
      name: 'Dev Business Owner',
      role: 'owner' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    admin: {
      id: 'dev-admin-id',
      email: 'dev-admin@example.com',
      name: 'Dev Admin',
      role: 'admin' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };
  
  return mockUsers[role];
};

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
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

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function generateVerificationCode(): Promise<string> {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeVerificationCode(email: string, code: string) {
  const hashedCode = await hashPassword(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  // Store in a temporary table or cache
  const { error } = await supabaseAdmin
    .from('verification_codes')
    .upsert({
      email,
      code: hashedCode,
      expires_at: expiresAt.toISOString(),
    });
  
  if (error) throw error;
}

export async function verifyVerificationCode(email: string, code: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('verification_codes')
    .select('code, expires_at')
    .eq('email', email)
    .single();

  if (error || !data) return false;
  
  // Check if code has expired
  if (new Date() > new Date(data.expires_at)) {
    // Clean up expired code
    await supabaseAdmin.from('verification_codes').delete().eq('email', email);
    return false;
  }

  const isValid = await verifyPassword(code, data.code);
  
  if (isValid) {
    // Clean up used code
    await supabaseAdmin.from('verification_codes').delete().eq('email', email);
  }
  
  return isValid;
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
    const devMode = request.headers.get('x-dev-mode');
    const devRole = request.headers.get('x-dev-role') as 'student' | 'owner' | 'admin';
    
    if (devMode === 'true' && devRole) {
      console.log(`🔧 Dev Mode: Creating mock ${devRole} user`);
      return createMockUser(devRole);
    }
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

export function createAuthResponse(token: string, user: unknown) {
  const response = NextResponse.json({
    data: user,
    message: 'Authentication successful'
  });
  
  // Set HTTP-only cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/'
  });
  
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete('auth-token');
  return response;
}

// Middleware helper to protect routes
export async function requireAuth(request: NextRequest, allowedRoles?: string[]) {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return user;
} 