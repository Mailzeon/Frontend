import { NextRequest, NextResponse } from 'next/server';

// Paths that don't require a logged-in user
const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read auth info from cookies (set on login — see authStore.ts)
  const token = req.cookies.get('mp_token')?.value;
  const role  = req.cookies.get('mp_role')?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!token) {
    if (isPublic) return NextResponse.next(); // Allow login/register pages
    // Redirect everything else to login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── Already logged in visiting a public page ───────────────────────────────
  if (isPublic && token && role) {
    const url = req.nextUrl.clone();
    url.pathname = `/${role}/dashboard`;
    return NextResponse.redirect(url);
  }

  // ── Role-based route protection ────────────────────────────────────────────
  const isCustomerRoute = pathname.startsWith('/customer');
  const isWorkerRoute   = pathname.startsWith('/worker');
  const isAdminRoute    = pathname.startsWith('/admin');

  if (isCustomerRoute && role !== 'customer') {
    const url = req.nextUrl.clone();
    url.pathname = `/${role}/dashboard`;
    return NextResponse.redirect(url);
  }
  if (isWorkerRoute && role !== 'worker') {
    const url = req.nextUrl.clone();
    url.pathname = `/${role}/dashboard`;
    return NextResponse.redirect(url);
  }
  if (isAdminRoute && role !== 'admin') {
    const url = req.nextUrl.clone();
    url.pathname = `/${role}/dashboard`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
