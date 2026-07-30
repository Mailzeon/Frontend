'use client';
import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'mp_install_dismissed_at';
const DISMISS_DAYS = 14;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed (running standalone) — never show this
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Respect a recent dismissal
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // Android/desktop Chrome fires this when the site qualifies as installable —
    // we capture it so we can trigger the native install prompt on our own
    // button click, on our own schedule, instead of Chrome's default (often
    // ignored) mini-infobar.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari never fires beforeinstallprompt — there's no programmatic
    // install API there at all, so we just show manual instructions instead,
    // gated to actual iOS Safari (not, say, iOS Chrome, which can't install
    // PWAs either but showing Safari-specific steps there would be wrong).
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in">
      <div className="glass-elevated p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0 shadow-glow-purple">
          {showIosHint ? <Share className="w-5 h-5 text-white" /> : <Download className="w-5 h-5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">Install Mailzeon</p>
          {showIosHint ? (
            <p className="text-xs text-gray-400 mt-1">
              Tap <Share className="w-3 h-3 inline" /> Share, then <strong className="text-gray-300">&quot;Add to Home Screen&quot;</strong> — needed for order alerts to work reliably on iPhone.
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Get the app icon on your home screen and more reliable order notifications.
            </p>
          )}
          {!showIosHint && (
            <button onClick={install}
              className="mt-2 text-xs font-medium text-purple-400 hover:text-purple-300">
              Install now
            </button>
          )}
        </div>
        <button onClick={dismiss} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
