import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-edge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes that don't need auth, static files, and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/test-email') ||
    pathname === '/test-email' ||
    pathname.includes('.') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/student-coming-soon' ||
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
  // Note: /api/students routes can be accessed by business owners viewing student profiles
  if (pathname.startsWith('/api/students')) {
    // Allow business owners to access student profiles for applicants
    if (user.role !== 'owner' && user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (pathname.startsWith('/api/student') && user.role !== 'student') {
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