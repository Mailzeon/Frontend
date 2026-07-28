'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Footer } from '@/components/shared/Footer';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [show, setShow]           = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toast.error('This reset link is invalid. Please request a new one.'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, newPassword: password });
      if (!data.success) { toast.error(data.message); return; }
      toast.success('Password reset! Please log in with your new password.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#08080D] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Set a new password</h1>
          <p className="text-gray-400 mt-1 text-sm">Make it something you'll remember</p>
        </div>

        <div className="glass-card p-8">
          {!token ? (
            <div className="text-center space-y-4">
              <p className="text-gray-300 text-sm">
                This reset link is missing or invalid. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full" size="lg">Request new link</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password" type={show ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" className="pr-10" autoFocus
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm" type={show ? 'text' : 'password'} placeholder="••••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Reset password
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// useSearchParams() requires a Suspense boundary in the App Router, or Next
// throws a build error ("missing-suspense-with-csr-bailout") during `next build`.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
