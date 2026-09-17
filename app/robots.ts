import type { MetadataRoute } from 'next';

// Next.js auto-serves this at /robots.txt. Nothing was here before at all —
// no robots.txt existed, which isn't a hard block on its own (Google
// crawls by default when nothing says otherwise), but its ABSENCE also
// means there was no explicit sitemap pointer either, one less signal
// helping Google discover and prioritize this brand-new site. Combined
// with app/sitemap.ts, this is the standard pair search engines look for
// first on any domain.
//
// NEW: explicit allow-rules for the named AI crawlers (ChatGPT, Claude,
// Gemini, Perplexity, Apple Intelligence) on top of the '*' wildcard that
// already covers them implicitly. Being explicit matters for two reasons:
// it documents the choice clearly (so nobody later adds a broader
// Disallow without realizing it silently cuts off AI visibility too), and
// it distinguishes the bots that matter for actually being CITED in a
// live AI answer (OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
// Claude-User, PerplexityBot, Perplexity-User) from the ones that only
// feed a future TRAINING run (GPTBot, ClaudeBot, Google-Extended,
// Applebot-Extended) — training inclusion isn't something a site owner
// can request or control at all, so allowing those costs nothing either
// way, but the search/citation bots are the ones that can start
// referencing Mailzeon as soon as they crawl it, no training cycle
// needed.
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
      // OpenAI (ChatGPT)
      { userAgent: 'GPTBot',        allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User',  allow: '/' },
      // Anthropic (Claude)
      { userAgent: 'ClaudeBot',        allow: '/' },
      { userAgent: 'Claude-User',      allow: '/' },
      { userAgent: 'Claude-SearchBot', allow: '/' },
      // Google (Gemini / AI Overviews) — separate from Googlebot itself,
      // which the '*' rule and Search Console verification already cover
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'GoogleOther',     allow: '/' },
      // Perplexity
      { userAgent: 'PerplexityBot',   allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },
      // Apple Intelligence
      { userAgent: 'Applebot-Extended', allow: '/' },
    ],
    sitemap: 'https://mailzeon.shop/sitemap.xml',
  };
}
