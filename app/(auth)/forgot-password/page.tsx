'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Footer } from '@/components/shared/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      // Backend always returns success (even if the email doesn't exist) —
      // this is intentional, so we never reveal which emails are registered.
      if (data.success) setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Forgot password?</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {sent ? 'Check your inbox for the reset link' : "No worries, we'll send you a reset link"}
          </p>
        </div>

        <div className="glass-card p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                <MailCheck className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                If an account exists for <span className="text-white font-medium">{email}</span>,
                we've sent a password reset link. It expires in 30 minutes.
              </p>
              <p className="text-gray-500 text-xs">
                Didn't get it? Check your spam folder, or{' '}
                <button onClick={() => setSent(false)} className="text-purple-400 hover:text-purple-300 font-medium">
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" autoFocus
                />
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Send reset link
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
