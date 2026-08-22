'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Wrench, Loader2, Gift } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';
import { initSocket } from '@/lib/socket';
import { isTelegramMiniApp, getTelegramInitData, initTelegramWebApp } from '@/lib/telegram';

type Stage = 'checking' | 'not-telegram' | 'choosing-role' | 'logging-in' | 'error';

function TelegramEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);
  const [stage, setStage] = useState<Stage>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  // A ?ref= link can come from either a worker OR a customer sharing their
  // own code (two independent referral programs) — resolved server-side
  // based on whichever role the person picks below, same as the normal
  // register page.
  const referralCode = searchParams.get('ref')?.trim() || '';

  const completeLogin = async (initData: string, role?: 'customer' | 'worker') => {
    setStage('logging-in');
    try {
      const { data } = await api.post('/auth/telegram', {
        initData,
        ...(role ? { role } : {}),
        ...(referralCode ? { referralCode } : {}),
      });
      if (!data.success) { toast.error(data.message); setStage('error'); setErrorMsg(data.message); return; }
      const { user, token } = data.data;
      setAuth(user, token);
      initSocket(user._id, user.role);
      toast.success(`Welcome, ${user.name}!`);
      router.push(`/${user.role}/dashboard`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Something went wrong logging you in.';
      setErrorMsg(msg);
      setStage('error');
    }
  };

  useEffect(() => {
    initTelegramWebApp();

    if (!isTelegramMiniApp()) {
      setStage('not-telegram');
      return;
    }

    const initData = getTelegramInitData();
    if (!initData) { setStage('not-telegram'); return; }

    (async () => {
      try {
        const { data } = await api.post('/auth/telegram/check', { initData });
        if (data.success && data.data.exists) {
          // Returning user — no role needed, straight to login.
          await completeLogin(initData);
        } else {
          // Brand-new — needs to pick a role before an account can be made.
          setStage('choosing-role');
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Could not verify your Telegram login.');
        setStage('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseRole = (role: 'customer' | 'worker') => {
    const initData = getTelegramInitData();
    if (!initData) { setStage('not-telegram'); return; }
    completeLogin(initData, role);
  };

  return (
    <div className="min-h-screen bg-[#08080D] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {(stage === 'checking' || stage === 'logging-in') && (
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-gray-400 text-sm">
              {stage === 'checking' ? 'Checking your Telegram account...' : 'Logging you in...'}
            </p>
          </div>
        )}

        {stage === 'not-telegram' && (
          <div className="glass-card p-6 text-center space-y-3">
            <p className="text-white font-semibold">Open this from Telegram</p>
            <p className="text-sm text-gray-400">
              This page only works when launched from inside the Mailzeon Telegram bot.
            </p>
          </div>
        )}

        {stage === 'error' && (
          <div className="glass-card p-6 text-center space-y-3">
            <p className="text-white font-semibold">Couldn't log you in</p>
            <p className="text-sm text-gray-400">{errorMsg}</p>
          </div>
        )}

        {stage === 'choosing-role' && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <h1 className="text-xl font-bold text-white">Welcome to Mailzeon</h1>
              <p className="text-sm text-gray-400">How do you want to use it?</p>
              {referralCode && (
                <div className="flex items-center justify-center gap-2 text-xs text-purple-300 pt-1">
                  <Gift className="w-3.5 h-3.5" /> Referral code applied: {referralCode}
                </div>
              )}
            </div>
            <button
              onClick={() => chooseRole('customer')}
              className="w-full glass-card p-5 flex items-center gap-4 hover:border-purple-500/40 border border-transparent transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white">I want to order accounts</p>
                <p className="text-xs text-gray-500">Sign up as a customer</p>
              </div>
            </button>
            <button
              onClick={() => chooseRole('worker')}
              className="w-full glass-card p-5 flex items-center gap-4 hover:border-purple-500/40 border border-transparent transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white">I want to fulfill orders & earn</p>
                <p className="text-xs text-gray-500">Sign up as a worker</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// useSearchParams() requires a Suspense boundary in the App Router — same
// pattern as the normal register page.
export default function TelegramEntryPage() {
  return (
    <Suspense fallback={null}>
      <TelegramEntryInner />
    </Suspense>
  );
}
