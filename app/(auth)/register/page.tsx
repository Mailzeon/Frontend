'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, User, Briefcase, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { getDeviceId } from '@/lib/fingerprint';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';

function RegisterContent() {
  const router  = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);
  const { minimumOrderAmount, platformCommissionRate, fetchSettings } = useSettingsStore();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'customer' | 'worker'>('customer');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);

  // Referral codes are worker-only for now (see backend auth.service.ts) —
  // a ?ref= link only ever comes from another worker sharing theirs, so
  // defaulting the role picker to "Work & Earn" saves the new signup a step.
  const referralCode = searchParams.get('ref')?.trim() || '';
  useEffect(() => { if (referralCode) setRole('worker'); }, [referralCode]);

  useEffect(() => { fetchSettings(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) { toast.error('Please fill in all fields.'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const { data } = await api.post('/auth/register', {
        name: name.trim(), email: email.trim(), password, role,
        ...(referralCode ? { referralCode } : {}),
        ...(deviceId ? { deviceId } : {}),
      });
      if (!data.success) { toast.error(data.message); return; }
      const { user } = data.data;
      setAuth(user);
      initSocket(user._id, user.role);
      toast.success(data.message);
      router.push(`/${user.role}/dashboard`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const roleCard = (r: 'customer' | 'worker', Icon: React.ElementType, title: string, desc: string) => (
    <button type="button" onClick={() => setRole(r)}
      className={cn(
        'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150',
        role === r
          ? 'border-purple-500/60 bg-gradient-to-b from-purple-600/15 to-purple-600/5 text-white shadow-glow-purple'
          : 'border-white/[0.06] text-gray-400 hover:border-white/[0.12] hover:bg-white/[0.02]'
      )}>
      <Icon className={cn('w-6 h-6', role === r ? 'text-purple-400' : 'text-gray-500')} />
      <span className="font-medium text-sm">{title}</span>
      <span className="text-xs text-gray-500 text-center">{desc}</span>
    </button>
  );

  const workerEarnLabel = `${100 - platformCommissionRate}%`;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#08080D] p-4 overflow-hidden">
      <div className="ambient-glow w-[32rem] h-[32rem] -top-40 -right-32" />
      <div className="ambient-glow w-[26rem] h-[26rem] bottom-0 -left-24" style={{ animationDelay: '3s' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/icon-192.png" alt="Mailzeon" className="w-14 h-14 rounded-2xl mx-auto mb-4 shadow-glow-purple" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Create account</h1>
          <p className="text-gray-400 mt-1 text-sm">Join Mailzeon today</p>
        </div>

        <div className="glass-card p-8">
          {referralCode && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-5">
              <Gift className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="text-xs text-purple-300">
                You're signing up with a worker's referral link.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>I want to</Label>
              <div className="flex gap-3">
                {roleCard('customer', User, 'Buy Services', 'Place orders & get results')}
                {roleCard('worker', Briefcase, 'Work & Earn', `Complete orders & earn`)}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? 'text' : 'password'} placeholder="Min 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {role === 'worker' && (
              <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-xs text-yellow-400">
                  ⚠️ Worker accounts require admin approval before you can accept orders. You&apos;ll be notified once approved.
                </p>
                <p className="text-xs text-yellow-400/80 mt-1">
                  You keep {workerEarnLabel} of every order you complete (minimum order is ₹{minimumOrderAmount}).
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// useSearchParams() (used above to read ?ref=...) opts the page out of
// static generation unless wrapped in Suspense — see the same fix applied
// earlier to app/customer/wallet/page.tsx.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
