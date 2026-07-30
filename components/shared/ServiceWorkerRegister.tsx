'use client';
import { useEffect } from 'react';

/**
 * Registers the service worker as early as possible on every page load —
 * separate from actually subscribing to push (that only happens when the
 * user clicks "Enable" on their Profile page, see lib/pushNotifications.ts).
 *
 * This matters because Chrome's PWA install-eligibility check
 * (`beforeinstallprompt`) requires an active service worker registration to
 * exist BEFORE it will consider the site installable. Without this, the
 * InstallPrompt banner would only ever show for someone who had already
 * enabled push notifications — backwards from what we want.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }
  }, []);

  return null;
}
