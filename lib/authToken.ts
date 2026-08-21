// BUG FIX (Aug 2026): Safari, Firefox, and Brave all block third-party
// cookies BY DEFAULT — and our session cookie IS a third-party cookie from
// the browser's point of view, since the frontend (Vercel) and API
// (Render) are different domains. On those browsers the httpOnly cookie
// set by login/register silently never gets stored at all: the person
// sees "logged in successfully", the app optimistically shows them the
// dashboard, and then the very first real API call 401s (no cookie ever
// arrived) and bounces them straight back to /login — reported as "login
// isn't working", with no error that actually explains why.
//
// This holds a fallback copy of the session token so api.ts can attach it
// as `Authorization: Bearer <token>` on every request — the backend
// already accepts this (see auth.middleware.ts, cookie checked first,
// falls back to this header). For any browser where the cookie DOES get
// stored correctly, this header is simply redundant and harmless.
//
// Deliberately sessionStorage, NOT localStorage: this is the one piece of
// the original httpOnly-cookie migration this partially reopens, so it's
// worth being explicit about the tradeoff. localStorage was migrated away
// from because a stored XSS payload could silently read it and keep
// working indefinitely — even for users who logged in once, closed the
// browser, and never came back. sessionStorage still doesn't fully close
// that door (a LIVE XSS payload during an active session could still read
// it — but at that point it could just make authenticated requests
// directly using the ambient cookie anyway, so this doesn't meaningfully
// widen what a live XSS attack can already do). What sessionStorage DOES
// avoid is the indefinite persistence: it's cleared the moment the tab or
// browser closes, so there's no long-lived token sitting in storage for a
// LATER, unrelated XSS bug to find.
const STORAGE_KEY = 'mp_auth_token_fallback';

export const setAuthToken = (token: string | null | undefined): void => {
  if (typeof window === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Safari Private Browsing (and similar) can throw on storage access —
    // fail silently. Worst case, that specific session falls back to
    // cookie-only behavior, same as before this fix existed.
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const clearAuthToken = (): void => setAuthToken(null);
