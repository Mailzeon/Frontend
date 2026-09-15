import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from '@/components/ui/toast';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister';
import { AppInstallDetector } from '@/components/shared/AppInstallDetector';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

export const metadata: Metadata = {
  // NEW: required for Next.js to turn the relative image paths below
  // ('/og-image.png' etc.) into full absolute URLs in the actual
  // <meta> tags it generates — without this, some crawlers/link-preview
  // bots (Google, WhatsApp, Telegram) can fail to resolve the image at
  // all, silently showing no preview image.
  metadataBase: new URL('https://mailzeon.shop'),
  title: { default: 'Mailzeon — Email Accounts Created On Demand', template: '%s | Mailzeon' },
  // NEW: canonical URL — tells Google "this is THE authoritative URL for
  // this content", which matters here specifically because the site is
  // reachable from two different domains (mailzeon.shop AND the Vercel-
  // assigned mailzeon.vercel.app) — without a canonical tag, Google can
  // treat those as separate, competing pages and split ranking signal
  // between them instead of consolidating it onto the real domain.
  alternates: { canonical: '/' },
  // FIX: this used to be a generic, placeholder-looking one-liner
  // ('Premium marketplace platform') — said nothing about what Mailzeon
  // actually does. Now matters more than ever since ads are driving real
  // traffic: this exact string is what shows up under the title in Google
  // search results and as the description line when the link is shared.
  description: 'Get any email account created for you — Gmail, Outlook, Yahoo, and more. Place an order, a verified worker delivers your credentials. Starting at just ₹15.',
  // NEW: Open Graph + Twitter Card metadata — without this, sharing the
  // Mailzeon link in a DM, WhatsApp, or social post showed either nothing
  // or a broken/blank preview card. og-image.png is a static 1200x630
  // branded image in /public (see the design in app/page.tsx's hero copy).
  openGraph: {
    title: 'Mailzeon — Email Accounts Created On Demand',
    description: 'Get any email account created for you — Gmail, Outlook, Yahoo, and more. Starting at just ₹15.',
    url: 'https://mailzeon.shop',
    siteName: 'Mailzeon',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Mailzeon — Get any email account created for you, on demand' }],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mailzeon — Email Accounts Created On Demand',
    description: 'Get any email account created for you — Gmail, Outlook, Yahoo, and more. Starting at just ₹15.',
    images: ['/og-image.png'],
  },
  // NEW: makes the site installable as a home-screen app (PWA) — this is
  // what makes push notifications reliable on iOS Safari (which requires
  // "Add to Home Screen" for push to work at all) and gives Android/desktop
  // a proper app icon + standalone window instead of a browser tab.
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mailzeon',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#08080D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // NEW: Organization + WebSite structured data (JSON-LD). This is the
  // single most direct signal for the "Google search 'Mailzeon' shows a
  // Brazilian footballer instead" problem — it explicitly tells Google
  // "the entity named Mailzeon is this website, here's its real name and
  // URL", rather than leaving Google to guess purely from crawled text
  // and fall back to a phonetically-similar spell-correction ("Mailson").
  // This alone can't force a #1 ranking overnight (new-domain authority
  // and backlinks still matter, and Google indexing a brand-new page can
  // take days to weeks even once it starts crawling) — but it removes any
  // ambiguity about what "Mailzeon" refers to once Google does index it.
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://mailzeon.shop/#organization',
        name: 'Mailzeon',
        alternateName: 'Mailzeon Marketplace',
        url: 'https://mailzeon.shop',
        logo: 'https://mailzeon.shop/icon-512.png',
        description: 'Mailzeon is an on-demand email account marketplace — order Gmail, Outlook, Yahoo, and other email accounts, created and delivered by verified workers.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://mailzeon.shop/#website',
        name: 'Mailzeon',
        url: 'https://mailzeon.shop',
        publisher: { '@id': 'https://mailzeon.shop/#organization' },
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Loads harmlessly outside Telegram — window.Telegram simply never
            appears on a normal browser visit, so nothing here changes
            behavior for the website. beforeInteractive so it's ready before
            our own code ever checks isTelegramMiniApp() (see
            lib/telegram.ts, called directly from app/telegram/page.tsx). */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[#08080D] text-gray-100 antialiased`}>
        {children}
        <ServiceWorkerRegister />
        <AppInstallDetector />
        <InstallPrompt />
        <Toaster />
        {/* Vercel Analytics — page-view + traffic tracking, visible in the
            Vercel dashboard (Analytics tab), NOT inside Mailzeon's own
            admin panel. See lib/analytics.ts's trackSignup() for the one
            custom event layered on top (page views alone don't tell you
            who actually completed signup, only who visited /register). */}
        <Analytics />
      </body>
    </html>
  );
}
