import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev mode bypass - skip all authentication if DEV_MODE is enabled
  if (process.env.DEV_MODE === 'true') {
    // Still allow API routes and static files to pass through normally
    if (
      pathname.startsWith('/_next') ||
      pathname.includes('.') ||
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/business/register' ||
      pathname === '/business/login'
    ) {
      return NextResponse.next();
    }

    // For protected routes in dev mode, inject a mock user into headers
    const response = NextResponse.next();
    
    // Determine role based on path for dev mode
    let devRole = 'student';
    if (pathname.startsWith('/business')) {
      devRole = 'owner';
    } else if (pathname.startsWith('/admin')) {
      devRole = 'admin';
    }
    
    // Add dev mode headers to help with API routes
    response.headers.set('x-dev-mode', 'true');
    response.headers.set('x-dev-role', devRole);
    
    return response;
  }

  // Normal authentication flow for production
  // Skip middleware for API routes that don't need auth, static files, and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/business/register' ||
    pathname === '/business/login'
  ) {
    // But in dev mode, we need to add headers for API routes too
    if (process.env.DEV_MODE === 'true' && pathname.startsWith('/api/auth')) {
      const response = NextResponse.next();
      
      // Determine role based on referer for API routes
      const referer = request.headers.get('referer') || '';
      let devRole = 'student';
      
      if (referer.includes('/business')) {
        devRole = 'owner';
      } else if (referer.includes('/admin')) {
        devRole = 'admin';
      }
      
      response.headers.set('x-dev-mode', 'true');
      response.headers.set('x-dev-role', devRole);
      
      return response;
    }
    
    return NextResponse.next();
  }

  // For all other routes in dev mode, set appropriate headers
  if (process.env.DEV_MODE === 'true') {
    const response = NextResponse.next();
    
    // Determine role based on path and referer
    const referer = request.headers.get('referer') || '';
    let devRole = 'student';
    
    if (pathname.startsWith('/business') || pathname.startsWith('/api/business') || referer.includes('/business')) {
      devRole = 'owner';
    } else if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || referer.includes('/admin')) {
      devRole = 'admin';
    }
    
    response.headers.set('x-dev-mode', 'true');
    response.headers.set('x-dev-role', devRole);
    
    return response;
  }

  // Check authentication for protected routes
  const user = await getUserFromRequest(request);

  // Redirect unauthenticated users to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based route protection
  if (pathname.startsWith('/student')) {
    if (user.role !== 'student') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } else if (pathname.startsWith('/business')) {
    if (user.role !== 'owner') {
      return NextResponse.redirect(new URL('/business/login', request.url));
    }
  } else if (pathname.startsWith('/admin')) {
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // API route protection
  if (pathname.startsWith('/api/student') && user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (pathname.startsWith('/api/business') && user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (pathname.startsWith('/api/admin') && user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 