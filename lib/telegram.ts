// Thin wrapper around Telegram's injected `window.Telegram.WebApp` object
// (loaded via the <script src="https://telegram.org/js/telegram-web-app.js">
// tag in app/layout.tsx). That script loads harmlessly on a normal browser
// visit too — window.Telegram simply never appears outside an actual
// Telegram Mini App WebView, so everything here is a no-op / returns null
// on the regular website.
interface TelegramContactResponse {
  status: 'sent' | 'cancelled';
  responseUnsafe?: {
    auth_date: string;
    hash: string;
    contact: {
      first_name: string;
      last_name?: string;
      phone_number: string;
      user_id: number;
    };
  };
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  // Which Telegram client this is running inside — 'android' | 'ios' |
  // 'tdesktop' | 'macos' | 'web' | 'weba' | 'unigram' | 'unknown'. Used to
  // gate requestTelegramPhoneNumber() below to the two platforms where
  // Telegram actually supports it.
  platform: string;
  ready: () => void;
  expand: () => void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  // Opens Telegram's own native "share phone number?" confirmation popup —
  // this is the ONLY way to get a phone number out of Telegram at all (see
  // requestTelegramPhoneNumber() below for why there's no silent/automatic
  // route). `sent` is false if the user tapped "Cancel" on Telegram's popup.
  requestContact: (callback: (sent: boolean, response: TelegramContactResponse) => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const isTelegramMiniApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  // initData is only ever non-empty inside a REAL Telegram WebView — the
  // script injects window.Telegram.WebApp everywhere it loads, but a
  // normal browser visit has no initData to give it.
  return !!window.Telegram?.WebApp?.initData;
};

// requestContact() only actually opens Telegram's native "share your
// number?" popup on the two mobile apps — on every other client
// (Desktop, macOS, Web) the method exists but the callback simply never
// fires (see requestTelegramPhoneNumber()'s comment below). Gating the
// button itself on platform, rather than only relying on the timeout
// fallback, means people on Desktop/Web never see a button that's
// guaranteed to fail — they just get the manual phone field, same as any
// non-Telegram signup.
export const supportsTelegramContactRequest = (): boolean => {
  const platform = getTelegramWebApp()?.platform;
  return platform === 'android' || platform === 'ios';
};

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
};

export const getTelegramInitData = (): string | null => {
  return getTelegramWebApp()?.initData || null;
};

// Telegram's own copy of the user's name/photo, straight from initData —
// used only for the "Continue as..." confirmation screen (app/telegram/
// page.tsx) before the backend check resolves. This is NOT trusted for
// anything security-relevant (initDataUnsafe is exactly that — unsafe,
// unverified client-side data); the actual login always re-verifies the
// signed initData string server-side (see utils/telegramAuth.ts).
export const getTelegramUser = (): { firstName: string; photoUrl?: string } | null => {
  const u = getTelegramWebApp()?.initDataUnsafe?.user;
  if (!u) return null;
  return { firstName: u.first_name, photoUrl: u.photo_url };
};

// Called once on the /telegram entry page — expands the WebView to full
// height (otherwise Telegram opens it as a half-height sheet) and signals
// to Telegram that the app has finished loading its initial UI.
export const initTelegramWebApp = (): void => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
};

// One-tap phone autofill for Telegram-origin accounts (see
// ProfilePage.tsx). Telegram's Bot API / Mini App initData NEVER exposes a
// user's phone number silently — requestContact()'s native "share your
// number?" popup, which needs one explicit tap to confirm, is the ONLY
// route Telegram offers at all; there is no way to skip that tap. What
// this DOES remove entirely is manual typing — one tap fills the field,
// same as typing it in by hand, then it goes through the exact same
// verifyPhone() check as any manually-typed number (see user.routes.ts) —
// this is deliberately NOT treated as pre-verified, since the response's
// signature scheme isn't part of Telegram's officially documented
// validating-data spec the way initData's is, so re-checking it the normal
// way costs nothing and keeps the security bar identical either way.
//
// PLATFORM GAP: requestContact only ever actually shows Telegram's native
// popup on the mobile apps (Android/iOS) — on Telegram Desktop and Telegram
// Web, the method exists (so the `tg?.requestContact` check above doesn't
// catch it) but the client silently never fires the callback at all. With
// no timeout, that left this stuck on "Asking Telegram…" forever with no
// way out. The timeout below is the fix — same graceful "type it in
// manually" fallback as an outright cancel, just triggered by a clock
// instead of a Telegram response.
//
// Returns a bare 10-digit Indian mobile number ready to drop into the
// phone field, or null if the user cancelled, isn't on a supported number
// format, this isn't running inside Telegram at all, or (Desktop/Web) the
// platform never responds within the timeout.
export const requestTelegramPhoneNumber = (): Promise<string | null> => {
  return new Promise(resolve => {
    const tg = getTelegramWebApp();
    if (!tg?.requestContact) { resolve(null); return; }

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return; // callback firing AFTER the timeout already resolved — ignore it
      settled = true;
      resolve(value);
    };

    const timeoutId = setTimeout(() => finish(null), 8000);

    tg.requestContact((sent, response) => {
      clearTimeout(timeoutId);
      const raw = sent ? response?.responseUnsafe?.contact?.phone_number : null;
      if (!raw) { finish(null); return; }

      // Telegram gives international format, e.g. "919876543210" or
      // "+919876543210" — strip a leading "+", then a leading "91" country
      // code, down to the bare 10-digit number our backend's
      // ^[6-9]\d{9}$ check expects. Anything that doesn't end up matching
      // that shape (a non-Indian number) is dropped rather than guessed at
      // — the person just types theirs in manually in that case.
      const digitsOnly = raw.replace(/\D/g, '');
      const local = digitsOnly.startsWith('91') && digitsOnly.length === 12
        ? digitsOnly.slice(2)
        : digitsOnly;
      finish(/^[6-9]\d{9}$/.test(local) ? local : null);
    });
  });
};
