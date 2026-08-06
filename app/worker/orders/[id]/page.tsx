'use client';
import { shortId, formatDate, formatCurrency, formatCountdown, cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send, Fingerprint, Clock, Mail, CheckCircle2 } from 'lucide-react';
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
import { useSettingsStore } from '@/store/settingsStore';
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
  const { autoCompleteHours, fetchSettings } = useSettingsStore();
  const [order, setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  // NEW: email is now pre-filled + locked to order.requestedEmail once loaded
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [notes, setNotes]   = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      if (data.success) setOrder(data.data);
    } catch { toast.error('Failed to load order.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    fetchSettings();
    const socket = getSocket();
    if (!socket) return;
    socket.on(SOCKET_EVENTS.NUMBER_SUBMITTED, () => { toast.info('Customer sent a verification number!'); fetchOrder(); });
    // NEW: previously missing — the order could change status (auto-cancel
    // after the customer's verification request went unanswered, customer
    // manually confirming success, admin resolving a dispute, etc.) while
    // a worker had this exact page open, and they'd see stale data until a
    // manual refresh.
    socket.on(SOCKET_EVENTS.ORDER_CANCELLED, () => { toast.error('This order was cancelled.'); fetchOrder(); });
    socket.on(SOCKET_EVENTS.ORDER_COMPLETED, () => { toast.success('Order completed! Earnings released.'); fetchOrder(); });
    return () => {
      socket.off(SOCKET_EVENTS.NUMBER_SUBMITTED);
      socket.off(SOCKET_EVENTS.ORDER_CANCELLED);
      socket.off(SOCKET_EVENTS.ORDER_COMPLETED);
    };
  }, [fetchOrder]);

  // NEW: once the order loads, lock the email field to exactly what the
  // customer requested — the worker must create THIS account, not a
  // different one of their own choosing.
  useEffect(() => {
    if (order?.requestedEmail) setEmail(order.requestedEmail);
  }, [order?.requestedEmail]);

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

  const confirmNumber = async () => {
    setActing(true);
    try {
      const { data } = await api.patch(`/orders/${id}/confirm-number`, {});
      if (data.success) { toast.success('Confirmed! Customer has been notified.'); fetchOrder(); }
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

      {/* NEW: requested email callout — shown throughout the working states */}
      {order.requestedEmail && (isAccepted || order.status === 'credentials_submitted' || isVerif) && (
        <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Email to create</p>
          </div>
          <p className="text-white font-mono text-sm break-all">{order.requestedEmail}</p>
        </div>
      )}

      {/* Step 1 — Submit credentials */}
      {isAccepted && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">1</div>
            <h2 className="font-semibold text-white">Submit Credentials</h2>
          </div>
          <p className="text-sm text-gray-400">Create the account using the exact email shown above, then submit the password here. The customer will NOT see your name or contact info.</p>
          <form onSubmit={submitCredentials} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email {order.requestedEmail && <span className="text-gray-500">(locked to customer&apos;s request)</span>}</Label>
              <Input
                placeholder="account@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!!order.requestedEmail}
                className={order.requestedEmail ? 'opacity-70 cursor-not-allowed' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="Account password" value={password} onChange={e => setPass(e.target.value)} autoFocus />
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

      {/* Step 2 — Confirm verification number on your own device */}
      {isVerif && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">2</div>
            <h2 className="font-semibold text-white">Verify Login on Your Device</h2>
          </div>

          {order.verificationCode ? (
            <>
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 space-y-3">
                <p className="text-sm text-yellow-400">
                  Open the Google prompt on the device you're already logged into for this
                  account. Tap <span className="font-semibold">"Yes, it's me"</span>, then select
                  the number below.
                </p>
                <div className="text-center py-3 rounded-xl bg-black/20">
                  <p className="text-xs text-gray-500 mb-1">Select this number</p>
                  <p className="text-4xl font-bold font-mono text-white tracking-widest">{order.verificationCode}</p>
                </div>
              </div>

              {order.verificationConfirmed ? (
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-medium py-2">
                  <CheckCircle2 className="w-4 h-4" /> Confirmed — waiting for customer to finish logging in
                </div>
              ) : (
                <Button onClick={confirmNumber} className="w-full" loading={acting}>
                  <Fingerprint className="w-4 h-4 mr-2" /> I've Selected It On My Device
                </Button>
              )}
              {order.verificationConfirmed && (
                <p className="text-xs text-gray-500 text-center">
                  If the number expires before the customer finishes, they'll send a new one — this screen updates automatically.
                </p>
              )}
            </>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.03] text-sm text-gray-400 text-center">
              Waiting for the customer to submit the number they see on their screen...
            </div>
          )}
        </div>
      )}

      {/* Waiting states */}
      {order.status === 'credentials_submitted' && (
        <div className="glass-card p-6 text-center space-y-2">
          <p className="font-semibold text-white">Credentials submitted ✓</p>
          <p className="text-sm text-gray-400">Waiting for customer to confirm. Your earnings will be released once confirmed or after {autoCompleteHours} hours.</p>
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

      {order.status === 'cancelled' && (
        <div className="glass-card p-6 text-center space-y-2 border border-gray-500/20">
          <p className="font-semibold text-white">Order Cancelled</p>
          <p className="text-sm text-gray-400">This order was cancelled following a dispute review. No earnings were released for it.</p>
        </div>
      )}
    </div>
  );
}
