'use client';
import { shortId, formatDate, formatCurrency, formatCountdown, cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send, Key, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Order } from '@/types';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { useOrderTimer } from '@/hooks/useOrderTimer';
import Link from 'next/link';

function TimerBadge({ expiresAt }: { expiresAt?: string }) {
  const { formattedTime, isWarning, isExpired } = useOrderTimer(expiresAt);
  if (!expiresAt) return null;
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg border',
      isExpired ? 'bg-gray-500/10 border-gray-500/20 text-gray-400' :
      isWarning  ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse-soft' :
                   'bg-blue-500/10 border-blue-500/20 text-blue-400'
    )}>
      <Clock className="w-5 h-5" />
      {isExpired ? 'Timer expired' : formattedTime}
    </div>
  );
}

export default function WorkerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [notes, setNotes]   = useState('');
  const [code, setCode]     = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      if (data.success) setOrder(data.data);
    } catch { toast.error('Failed to load order.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const socket = getSocket();
    if (!socket) return;
    socket.on(SOCKET_EVENTS.CODE_REQUESTED,     () => { toast.info('Customer requested a verification code!'); fetchOrder(); });
    socket.on(SOCKET_EVENTS.NEW_CODE_REQUESTED, () => { toast.info('Customer requested a new verification code!'); fetchOrder(); });
    return () => {
      socket.off(SOCKET_EVENTS.CODE_REQUESTED);
      socket.off(SOCKET_EVENTS.NEW_CODE_REQUESTED);
    };
  }, [fetchOrder]);

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error('Email and password are required.'); return; }
    setActing(true);
    try {
      const { data } = await api.patch(`/orders/${id}/credentials`, { email: email.trim(), password: password.trim(), notes: notes.trim() || undefined });
      if (data.success) { toast.success('Credentials submitted!'); fetchOrder(); }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(false); }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { toast.error('Enter the verification code.'); return; }
    setActing(true);
    try {
      const { data } = await api.patch(`/orders/${id}/submit-code`, { code: code.trim() });
      if (data.success) { toast.success('Code submitted!'); setCode(''); fetchOrder(); }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(false); }
  };

  if (loading) return (
    <div className="max-w-xl space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (!order) return <div className="text-gray-400">Order not found.</div>;

  const isAccepted = order.status === 'accepted';
  const isVerif    = order.status === 'verification_pending';
  const isDone     = ['completed','cancelled'].includes(order.status);

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/worker/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{order.serviceName}</h1>
          <p className="text-xs text-gray-500">{shortId(order._id)} · {formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-auto"><OrderStatusBadge status={order.status} /></div>
      </div>

      {/* Info row */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Your earnings</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(order.workerEarning)}</p>
        </div>
        {isAccepted && <TimerBadge expiresAt={order.timerExpiresAt} />}
      </div>

      {/* Step 1 — Submit credentials */}
      {isAccepted && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">1</div>
            <h2 className="font-semibold text-white">Submit Credentials</h2>
          </div>
          <p className="text-sm text-gray-400">Enter the account credentials for this service. The customer will NOT see your name or contact info.</p>
          <form onSubmit={submitCredentials} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email / Username</Label>
              <Input placeholder="account@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="Account password" value={password} onChange={e => setPass(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-500">(optional)</span></Label>
              <Input placeholder="Any additional info for the customer" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" loading={acting}>
              <Send className="w-4 h-4 mr-2" /> Submit Credentials
            </Button>
          </form>
        </div>
      )}

      {/* Step 2 — Verification code */}
      {isVerif && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">2</div>
            <h2 className="font-semibold text-white">Verification Code Required</h2>
          </div>
          <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">⚡ The customer needs a verification code. Check the authenticator app or SMS and enter it below.</p>
          </div>
          <form onSubmit={submitCode} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Verification Code</Label>
              <Input
                placeholder="e.g. 847291"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="text-center text-xl tracking-widest font-mono"
                maxLength={10}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" loading={acting}>
              <Key className="w-4 h-4 mr-2" /> Send Code to Customer
            </Button>
          </form>
        </div>
      )}

      {/* Waiting states */}
      {order.status === 'credentials_submitted' && (
        <div className="glass-card p-6 text-center space-y-2">
          <p className="font-semibold text-white">Credentials submitted ✓</p>
          <p className="text-sm text-gray-400">Waiting for customer to confirm. Your earnings will be released once confirmed or after 24 hours.</p>
        </div>
      )}

      {order.status === 'completed' && (
        <div className="glass-card p-6 text-center space-y-2 border border-green-500/20">
          <p className="text-2xl">🎉</p>
          <p className="font-bold text-white">Order Completed!</p>
          <p className="text-sm text-gray-400">{formatCurrency(order.workerEarning)} has been added to your wallet.</p>
        </div>
      )}

      {order.status === 'under_review' && (
        <div className="glass-card p-6 text-center space-y-2 border border-red-500/20">
          <p className="font-semibold text-white">Under Review</p>
          <p className="text-sm text-gray-400">The customer raised a dispute. Admin is reviewing this order.</p>
        </div>
      )}
    </div>
  );
}
