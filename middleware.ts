import { NextRequest, NextResponse } from 'next/server';

// Paths that don't require a logged-in user.
// FIX: /contact, /terms, /refund-policy, /pricing were missing — anyone
// without a token (including a Cashfree reviewer, who will never be
// logged in) was being bounced straight back to /login instead of seeing
// these pages.
const PUBLIC_PATHS = [
  '/login', '/register', '/contact', '/terms', '/refund-policy', '/pricing',
  '/forgot-password', '/reset-password',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read auth info from cookies (set on login — see authStore.ts).
  // NOTE: this is NOT the real session token — that's an httpOnly cookie
  // scoped to the backend's own domain (Render), which this frontend-domain
  // (Vercel) middleware could never read anyway, even if it wanted to,
  // since frontend and backend are on entirely separate domains. `mp_role`
  // is a small, non-sensitive cookie set purely so Edge middleware has
  // *something* to check for route-gating — actual authorization for every
  // real API call is enforced server-side against the httpOnly cookie.
  const role = req.cookies.get('mp_role')?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!role) {
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
  if (isAuthOnlyPage) {
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
