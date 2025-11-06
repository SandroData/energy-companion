import { NextResponse, NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/auth/callback', '/en/login', '/favicon.ico', '/api/auth/me'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check auth cookies (Supabase uses "sb-access-token" / "sb-refresh-token")
  const hasAccess = req.cookies.get('sb-access-token');
  const hasRefresh = req.cookies.get('sb-refresh-token');

  if (!hasAccess && !hasRefresh) {
    const url = req.nextUrl.clone();
    url.pathname = '/en/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets).*)'],
};
