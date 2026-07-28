'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { Footer } from '@/components/shared/Footer';

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      if (!data.success) { toast.error(data.message); return; }
      const { user } = data.data;
      setAuth(user);
      initSocket(user._id, user.role);
      toast.success(`Welcome back, ${user.name}!`);
      router.push(`/${user.role}/dashboard`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#08080D] p-4 overflow-hidden">
      {/* Ambient glow — the one decorative flourish on this page, kept well
          behind the content and never touching the form itself. */}
      <div className="ambient-glow w-[32rem] h-[32rem] -top-40 -left-32" />
      <div className="ambient-glow w-[26rem] h-[26rem] bottom-0 -right-24" style={{ animationDelay: '3s' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto mb-4 shadow-glow-purple">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to your Mailzeon account</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password" type={show ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" className="pr-10"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 font-medium">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
