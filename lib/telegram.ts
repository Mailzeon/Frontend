// Thin wrapper around Telegram's injected `window.Telegram.WebApp` object
// (loaded via the <script src="https://telegram.org/js/telegram-web-app.js">
// tag in app/layout.tsx). That script loads harmlessly on a normal browser
// visit too — window.Telegram simply never appears outside an actual
// Telegram Mini App WebView, so everything here is a no-op / returns null
// on the regular website.
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
  ready: () => void;
  expand: () => void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
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
