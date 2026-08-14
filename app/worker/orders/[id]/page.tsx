'use client';
import { shortId, formatDate, formatCurrency, formatCountdown, cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send, Fingerprint, Clock, Mail, CheckCircle2, Shuffle, KeyRound, ShieldAlert } from 'lucide-react';
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
  const [acknowledgedNoPhone, setAcknowledgedNoPhone] = useState(false);
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
    fetchSettings();
    const socket = getSocket();
    if (!socket) return;
    socket.on(SOCKET_EVENTS.NUMBER_SUBMITTED, () => { toast.info('Customer sent a verification number!'); fetchOrder(); });
    socket.on(SOCKET_EVENTS.CODE_REQUESTED,   () => { toast.info('Customer requested a verification code!'); fetchOrder(); });
    // NEW: previously missing — the order could change status (auto-cancel
    // after the customer's verification request went unanswered, customer
    // manually confirming success, admin resolving a dispute, etc.) while
    // a worker had this exact page open, and they'd see stale data until a
    // manual refresh.
    socket.on(SOCKET_EVENTS.ORDER_CANCELLED, () => { toast.error('This order was cancelled.'); fetchOrder(); });
    socket.on(SOCKET_EVENTS.ORDER_COMPLETED, () => { toast.success('Order completed! Earnings released.'); fetchOrder(); });
    return () => {
      socket.off(SOCKET_EVENTS.NUMBER_SUBMITTED);
      socket.off(SOCKET_EVENTS.CODE_REQUESTED);
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
    if (!acknowledgedNoPhone) { toast.error('Please confirm the account has no phone number linked.'); return; }
    setActing(true);
    try {
      const { data } = await api.patch(`/orders/${id}/credentials`, {
        email: email.trim(), password: password.trim(), notes: notes.trim() || undefined,
        acknowledgedNoPhone: true,
      });
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

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { toast.error('Enter the code before sending.'); return; }
    setActing(true);
    try {
      const { data } = await api.patch(`/orders/${id}/submit-code`, { code: code.trim() });
      if (data.success) { toast.success('Code sent to customer!'); setCode(''); fetchOrder(); }
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

      {/* Requested email callout — shown throughout the working states.
          'custom': exact address required. 'random': any address on the
          right domain works — this tells the worker which domain that is. */}
      {(isAccepted || order.status === 'credentials_submitted' || isVerif) && (
        order.requestedEmail ? (
          <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Email to create</p>
            </div>
            <p className="text-white font-mono text-sm break-all">{order.requestedEmail}</p>
          </div>
        ) : (
          <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-1">
              <Shuffle className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">Random — any account works</p>
            </div>
            <p className="text-white text-sm">
              Use any <span className="font-mono">@{order.domain}</span> account you already have, or make a new
              one — old or new, doesn't matter. Just make sure it's on <span className="font-mono">@{order.domain}</span>.
            </p>
          </div>
        )
      )}

      {/* Step 1 — Submit credentials */}
      {isAccepted && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">1</div>
            <h2 className="font-semibold text-white">Submit Credentials</h2>
          </div>
          <p className="text-sm text-gray-400">
            {order.requestedEmail
              ? 'Create the account using the exact email shown above, then submit the password here. The customer will NOT see your name or contact info.'
              : `Submit any @${order.domain} account you already have, or create a new one — then submit its password here. The customer will NOT see your name or contact info.`}
          </p>

          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              <span className="font-semibold">Important:</span> the account must NOT have a phone number
              linked to it. A linked number triggers extra Google verification steps the customer usually
              can't get past, which leads to disputes and a strike on your account. Use an account with no
              recovery phone attached.
            </p>
          </div>

          <form onSubmit={submitCredentials} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email {order.requestedEmail && <span className="text-gray-500">(locked to customer&apos;s request)</span>}</Label>
              <Input
                placeholder={order.requestedEmail ? 'account@example.com' : `youraccount@${order.domain}`}
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

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledgedNoPhone}
                onChange={e => setAcknowledgedNoPhone(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-purple-500 shrink-0"
              />
              <span className="text-xs text-gray-300 leading-relaxed">
                I confirm this account has <span className="font-semibold text-white">no phone number linked</span>.
              </span>
            </label>

            <Button type="submit" className="w-full" loading={acting} disabled={!acknowledgedNoPhone}>
              <Send className="w-4 h-4 mr-2" /> Submit Credentials
            </Button>
          </form>
        </div>
      )}

      {/* Step 2 — Respond to whichever verification method the customer picked */}
      {isVerif && order.verificationMethod === 'code' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">2</div>
            <h2 className="font-semibold text-white">Send Verification Code</h2>
          </div>
          <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">
              ⚡ Google gave the customer a code instead of a "select a number" prompt. Check the
              account for the code (authenticator app, SMS, etc.) and send it below.
            </p>
          </div>
          <form onSubmit={submitCode} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Verification Code</Label>
              <Input
                placeholder="e.g. 847291"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="text-center text-xl tracking-widest font-mono"
                maxLength={20}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" loading={acting}>
              <KeyRound className="w-4 h-4 mr-2" /> Send Code to Customer
            </Button>
          </form>
        </div>
      )}

      {isVerif && order.verificationMethod !== 'code' && (
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
              Waiting for the customer to submit the number they see on their screen (or request a code instead)...
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

      {order.status === 'under_review' && order.wrongPasswordGraceDeadline && new Date(order.wrongPasswordGraceDeadline) > new Date() && (
        <GraceWindowCard order={order} onSubmitted={fetchOrder} />
      )}

      {order.status === 'under_review' && !(order.wrongPasswordGraceDeadline && new Date(order.wrongPasswordGraceDeadline) > new Date()) && (
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

// Wrong-password grace window — see backend order.service.ts reportProblem()/
// resubmitCredentials(). Worker gets one timed chance to fix a wrong
// password before this becomes an admin-reviewable dispute.
function GraceWindowCard({ order, onSubmitted }: { order: Order; onSubmitted: () => void }) {
  const [email, setEmail]       = useState(order.requestedEmail || order.credentials?.email || '');
  const [password, setPassword] = useState('');
  const [notes, setNotes]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const deadlineMs = order.wrongPasswordGraceDeadline ? new Date(order.wrongPasswordGraceDeadline).getTime() : 0;
  const msLeft = Math.max(0, deadlineMs - now);
  const minutesLeft = Math.floor(msLeft / 60000);
  const secondsLeft = Math.floor((msLeft % 60000) / 1000);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error('Email and password are required.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.patch(`/orders/${order._id}/resubmit-credentials`, {
        email: email.trim(), password: password.trim(), notes: notes.trim() || undefined,
      });
      if (data.success) { toast.success('Corrected credentials submitted!'); onSubmitted(); }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="glass-card p-6 space-y-4 border border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-300">Customer Says: Wrong Password</p>
          <p className="text-sm text-yellow-400/90 mt-1">
            You have <span className="font-mono font-bold">{minutesLeft}:{secondsLeft.toString().padStart(2, '0')}</span> to
            resubmit the <span className="font-semibold">correct</span> password. If you don't respond in time,
            or it's wrong again, this goes to admin — if confirmed, it's treated as account theft and results in a
            <span className="font-semibold"> permanent ban</span>.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} disabled={!!order.requestedEmail} />
        </div>
        <div className="space-y-1.5">
          <Label>Correct Password</Label>
          <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Double-check this before submitting" />
        </div>
        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the customer should know" />
        </div>
        <Button type="submit" loading={submitting} className="w-full">
          <Send className="w-4 h-4 mr-2" /> Resubmit Corrected Password
        </Button>
      </form>
    </div>
  );
}
