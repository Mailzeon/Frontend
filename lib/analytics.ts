import { track } from '@vercel/analytics';

// Vercel Analytics tracks page VIEWS automatically (see app/layout.tsx's
// <Analytics/>) — it has no idea on its own whether a visit to /register
// actually ended in a completed signup. This is the one custom event
// layered on top so "who's landing on the page" and "who's actually
// signing up" show up as two different, comparable numbers in the Vercel
// dashboard's Events view, instead of only ever seeing page-view counts.
export function trackSignup(role: 'customer' | 'worker'): void {
  track('signup_completed', { role });
}
