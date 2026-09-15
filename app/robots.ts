import type { MetadataRoute } from 'next';

// Next.js auto-serves this at /robots.txt. Nothing was here before at all —
// no robots.txt existed, which isn't a hard block on its own (Google
// crawls by default when nothing says otherwise), but its ABSENCE also
// means there was no explicit sitemap pointer either, one less signal
// helping Google discover and prioritize this brand-new site. Combined
// with app/sitemap.ts, this is the standard pair search engines look for
// first on any domain.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing genuinely private lives at a crawlable URL anyway (every
        // real account page is already behind the login wall enforced by
        // middleware.ts), so there's no reason to disallow anything here.
      },
    ],
    sitemap: 'https://mailzeon.shop/sitemap.xml',
  };
}
