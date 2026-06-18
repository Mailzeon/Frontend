'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Zap, User, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'customer' | 'worker'>('customer');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) { toast.error('Please fill in all fields.'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name: name.trim(), email: email.trim(), password, role });
      if (!data.success) { toast.error(data.message); return; }
      const { user, token } = data.data;
      setAuth(user, token);
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
          ? 'border-purple-500 bg-purple-600/10 text-white'
          : 'border-[#374151] text-gray-400 hover:border-[#4B5563]'
      )}>
      <Icon className={cn('w-6 h-6', role === r ? 'text-purple-400' : 'text-gray-500')} />
      <span className="font-medium text-sm">{title}</span>
      <span className="text-xs text-gray-500 text-center">{desc}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-gray-400 mt-1 text-sm">Join Marketplace today</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role picker */}
            <div className="space-y-1.5">
              <Label>I want to</Label>
              <div className="flex gap-3">
                {roleCard('customer', User, 'Buy Services', 'Place orders & get results')}
                {roleCard('worker', Briefcase, 'Work & Earn', 'Complete orders & earn ₹20')}
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
    </div>
  );
}
