import { NextRequest, NextResponse } from 'next/server';

// Paths that don't require a logged-in user.
// FIX: /contact, /terms, /refund-policy, /pricing were missing — anyone
// without a token (including a Cashfree reviewer, who will never be
// logged in) was being bounced straight back to /login instead of seeing
// these pages.
const PUBLIC_PATHS = ['/login', '/register', '/contact', '/terms', '/refund-policy', '/pricing'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read auth info from cookies (set on login — see authStore.ts)
  const token = req.cookies.get('mp_token')?.value;
  const role  = req.cookies.get('mp_role')?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!token) {
    if (isPublic) return NextResponse.next(); // Allow login/register/compliance pages
    // Redirect everything else to login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── Already logged in ───────────────────────────────────────────────────────
  // FIX: previously ANY public path (including /contact, /terms, etc.) redirected
  // a logged-in user straight to their dashboard — meaning a logged-in customer
  // could never view the Terms or Contact page at all. Now only /login and
  // /register redirect away when already authenticated; the compliance pages
  // stay viewable for logged-in users too.
  const isAuthOnlyPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  if (isAuthOnlyPage && token && role) {
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
