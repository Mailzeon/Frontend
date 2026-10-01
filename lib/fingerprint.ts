import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Cached across calls within the same page session — computing a
// fingerprint isn't free, and register/login only need to call this once
// each anyway.
let cached: Promise<string> | null = null;

/**
 * Returns a best-effort browser fingerprint (a hash derived from canvas,
 * screen, timezone, fonts, and other browser signals via the open-source
 * FingerprintJS library) — sent to the backend alongside IP at register/
 * login as a second anti-evasion signal (see backend
 * utils/ipIntelligence.ts / LockedDevice.model.ts).
 *
 * Deliberately best-effort, not a hard requirement: if this fails for any
 * reason (ad blocker, browser quirk, SSR), it resolves to an empty string
 * rather than throwing, so a fingerprinting hiccup never blocks a real
 * signup or login.
 *
 * Honest limitation, not a silver bullet: clearing browser data or using a
 * different browser/incognito profile can produce a different fingerprint,
 * same as a VPN changes an IP. The backend combines this with IP and locks
 * on a match on EITHER — that combination is what actually raises the bar,
 * not this signal alone.
 */
export function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return Promise.resolve('');
  if (!cached) {
    cached = FingerprintJS.load()
      .then(fp => fp.get())
      .then(result => result.visitorId)
      .catch(() => '');
  }
  return cached;
}

/**
 * Returns the REAL device model (e.g. "Pixel 7", "SM-G991B") via User-
 * Agent Client Hints — the only way left to get this at all. Since
 * Chrome 110 (2023), Chrome deliberately freezes the plain User-Agent
 * header on Android to a generic placeholder ("Android 10; K") for every
 * device, for privacy reasons — that's why the admin panel's "Network &
 * Device" card kept showing the same generic label for almost every
 * worker/customer regardless of what phone they actually used; there was
 * never a real model in the header to parse in the first place. This is
 * sent up alongside the device fingerprint at register/login (see
 * app/(auth)/register/page.tsx, app/(auth)/login/page.tsx,
 * app/telegram/page.tsx) purely to make that admin-facing label accurate
 * — it has no anti-fraud role and isn't used for locking/matching
 * accounts (that's still getDeviceId() above).
 *
 * Chromium-only (Chrome, Edge, Samsung Internet, Opera) — the
 * `userAgentData` API doesn't exist at all in Firefox or Safari, so this
 * resolves to null there and the backend just falls back to its old
 * UA-string parsing for those visitors, same as before this existed.
 */
export function getDeviceModelHint(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const uaData = (navigator as any).userAgentData;
  if (!uaData?.getHighEntropyValues) return Promise.resolve(null);

  return uaData.getHighEntropyValues(['model'])
    .then((values: { model?: string }) => values.model?.trim() || null)
    .catch(() => null);
}
