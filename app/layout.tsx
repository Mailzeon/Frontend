import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { Toaster } from '@/components/ui/toast';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister';
import { AppInstallDetector } from '@/components/shared/AppInstallDetector';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Mailzeon', template: '%s | Mailzeon' },
  description: 'Premium marketplace platform',
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Loads harmlessly outside Telegram — window.Telegram simply never
            appears on a normal browser visit, so nothing here changes
            behavior for the website. beforeInteractive so it's ready before
            our own code ever checks isTelegramMiniApp() (see
            lib/telegram.ts, called directly from app/telegram/page.tsx). */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[#08080D] text-gray-100 antialiased`}>
        {children}
        <ServiceWorkerRegister />
        <AppInstallDetector />
        <InstallPrompt />
        <Toaster />
      </body>
    </html>
  );
}
