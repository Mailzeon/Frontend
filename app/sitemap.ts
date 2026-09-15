import type { MetadataRoute } from 'next';

// Next.js auto-serves this at /sitemap.xml. Only the genuinely PUBLIC pages
// go here — /login and /register are technically reachable while logged
// out, but there's no value in Google indexing a bare auth form as its own
// search result, so they're deliberately left out; "/" (the homepage) is
// the page that should actually rank for "Mailzeon".
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://mailzeon.shop';
  const now  = new Date();

  return [
    { url: base,                       lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/pricing`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/contact`,          lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms`,            lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/refund-policy`,    lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
