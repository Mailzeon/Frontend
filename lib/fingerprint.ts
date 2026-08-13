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
