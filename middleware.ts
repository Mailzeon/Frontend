import { NextRequest, NextResponse } from 'next/server';

// Paths that don't require a logged-in user.
// FIX: /contact, /terms, /refund-policy, /pricing were missing — anyone
// without a token (including a Cashfree reviewer, who will never be
// logged in) was being bounced straight back to /login instead of seeing
// these pages.
const PUBLIC_PATHS = [
  '/login', '/register', '/contact', '/terms', '/refund-policy', '/pricing',
  '/forgot-password', '/reset-password',
  // NEW — Telegram Mini App entry point. Must stay public: a Telegram user
  // has no `mp_role` cookie yet on their very first open (nothing has
  // logged them in yet), so this page needs to load BEFORE any redirect-
  // to-login happens, run its own initData-based check, and only THEN
  // auto-authenticate via initData. See app/telegram/page.tsx.
  '/telegram',
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

  // NEW: "/" is the public marketing homepage now (see app/page.tsx) —
  // handled as its own exact-match check rather than folded into
  // PUBLIC_PATHS' .startsWith() logic, since startsWith('/') would
  // otherwise match every single route on the site.
  const isRootPage = pathname === '/';
  const isPublic   = isRootPage || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!role) {
    if (isPublic) return NextResponse.next(); // Allow login/register/compliance pages + homepage
    // Redirect everything else to login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── Already logged in ───────────────────────────────────────────────────────
  // FIX: previously ANY public path (including /contact, /terms, etc.) redirected
  // a logged-in user straight to their dashboard — meaning a logged-in customer
  // could never view the Terms or Contact page at all. Now only /login, /register,
  // and "/" (the marketing homepage — an already-signed-up person has no reason
  // to see a "sign up now" pitch) redirect away when already authenticated; the
  // compliance pages stay viewable for logged-in users too.
  const isAuthOnlyPage = pathname.startsWith('/login') || pathname.startsWith('/register') || isRootPage;
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
  // Run on every real app route — everything ELSE (Next.js internals,
  // and any static file straight out of /public: favicon, manifest, the
  // service worker, icons, robots.txt, sitemap.xml, Google's site-
  // verification .html file, etc.) is excluded entirely.
  //
  // BUG FIX: this used to only exclude .png files — every other static
  // file in /public (robots.txt, sitemap.xml, manifest.json, sw.js, and
  // Google's google<token>.html verification file) was being treated as
  // a normal app route. A visitor with no `mp_role` cookie — which is
  // EVERY crawler/bot, Googlebot included, since bots never log in — hit
  // the "not logged in" branch above and got redirected to /login for all
  // of these. That's exactly why Google Search Console's ownership
  // verification failed with "wrong content": it requested the
  // verification file and got the /login page's HTML back instead. The
  // same bug was silently breaking robots.txt and sitemap.xml for Google
  // too, and sw.js for any logged-out visitor's service-worker
  // registration. Excluding by extension (not just an explicit path list)
  // means any FUTURE static file dropped into /public — another
  // verification file, a new manifest, etc. — is automatically exempt
  // without needing another middleware edit.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|svg|ico|html|txt|xml|json|webmanifest)$).*)',
  ],
};
