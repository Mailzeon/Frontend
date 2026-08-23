'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Wrench, Loader2, Gift, LogIn, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';
import { initSocket } from '@/lib/socket';
import {
  isTelegramMiniApp, getTelegramInitData, initTelegramWebApp, getTelegramUser,
} from '@/lib/telegram';

type Stage =
  | 'checking' | 'not-telegram' | 'error' | 'logging-in'
  | 'confirm-returning'   // this Telegram account is already linked — "Continue as X"
  | 'choosing-role'       // brand-new Telegram account — pick customer/worker
  | 'linking-login';      // "I already have an account" — email+password form

function TelegramEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);
  const [stage, setStage] = useState<Stage>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [existingName, setExistingName] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');

  const tgUser = getTelegramUser();

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
      if (!data.success) { setErrorMsg(data.message); setStage('error'); return; }
      const { user, token } = data.data;
      setAuth(user, token);
      initSocket(user._id, user.role);
      toast.success(`Welcome, ${user.name}!`);
      router.push(`/${user.role}/dashboard`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Something went wrong logging you in.');
      setStage('error');
    }
  };

  const runInitialCheck = async () => {
    const initData = getTelegramInitData();
    if (!initData) { setStage('not-telegram'); return; }

    try {
      const { data } = await api.post('/auth/telegram/check', { initData });
      if (data.success && data.data.exists) {
        // This Telegram account is already linked to a Mailzeon account —
        // confirm before logging in, rather than silently auto-logging in
        // with no way to say "actually, use a different account" (e.g.
        // after signing out specifically to switch accounts).
        setExistingName(data.data.name || 'there');
        setStage('confirm-returning');
      } else {
        setStage('choosing-role');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Could not verify your Telegram login.');
      setStage('error');
    }
  };

  useEffect(() => {
    initTelegramWebApp();
    if (!isTelegramMiniApp()) { setStage('not-telegram'); return; }
    runInitialCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueAsReturning = () => {
    const initData = getTelegramInitData();
    if (!initData) { setStage('not-telegram'); return; }
    completeLogin(initData);
  };

  const chooseRole = (role: 'customer' | 'worker') => {
    const initData = getTelegramInitData();
    if (!initData) { setStage('not-telegram'); return; }
    completeLogin(initData, role);
  };

  const submitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const initData = getTelegramInitData();
    if (!initData) { setStage('not-telegram'); return; }
    if (!linkEmail.trim() || !linkPassword) { toast.error('Enter your email and password.'); return; }

    setStage('logging-in');
    try {
      const { data } = await api.post('/auth/telegram/link', {
        initData, email: linkEmail.trim(), password: linkPassword,
      });
      if (!data.success) { setErrorMsg(data.message); setStage('error'); return; }
      const { user, token } = data.data;
      setAuth(user, token);
      initSocket(user._id, user.role);
      toast.success(`Linked! Welcome back, ${user.name}.`);
      router.push(`/${user.role}/dashboard`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not link that account.');
      setStage('linking-login');
    }
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

        {stage === 'confirm-returning' && (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto overflow-hidden">
              {tgUser?.photoUrl ? (
                <img src={tgUser.photoUrl} alt={existingName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-purple-300">{existingName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Welcome back, {existingName}</h1>
              <p className="text-sm text-gray-400 mt-1">Continue to your Mailzeon account?</p>
            </div>
            <button
              onClick={continueAsReturning}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
            >
              Continue as {existingName}
            </button>
            <button
              onClick={() => setStage('choosing-role')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Not you? Use a different account
            </button>
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

            <button
              onClick={() => setStage('linking-login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-purple-300 hover:text-purple-200 pt-2 transition-colors"
            >
              <LogIn className="w-4 h-4" /> Already have a Mailzeon account? Log in instead
            </button>
          </div>
        )}

        {stage === 'linking-login' && (
          <div className="space-y-5">
            <button
              onClick={() => setStage('choosing-role')}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-white">Log in to your account</h1>
              <p className="text-sm text-gray-400">
                This links your Telegram account to your existing Mailzeon login — next time, you'll open straight in.
              </p>
            </div>
            <form onSubmit={submitLink} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={linkEmail}
                onChange={e => setLinkEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <input
                type="password"
                placeholder="Password"
                value={linkPassword}
                onChange={e => setLinkPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
              >
                Log in & Link
              </button>
            </form>
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
