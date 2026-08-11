'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Shuffle, Edit3, Check, IndianRupee, Phone, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, timeAgo, formatCurrency, cn } from '@/lib/utils';
import { EMAIL_DOMAINS } from '@/lib/emailDomains';
import { openCashfreeCheckout } from '@/lib/cashfree';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Order } from '@/types';
import Link from 'next/link';

export default function CustomerOrdersPage() {
  const { user, updateUser } = useAuthStore();
  const { minimumOrderAmount, platformCommissionRate, fetchSettings } = useSettingsStore();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [service, setService]     = useState('');
  const [domain, setDomain]       = useState('');
  const [emailType, setEmailType] = useState<'random' | 'custom'>('random');
  const [customLocal, setCustomLocal] = useState('');
  const [amount, setAmount]       = useState('');
  const [phone, setPhone]         = useState('');
  // NEW: pre-payment "Check" button state for custom emails. `checkedFor`
  // remembers exactly which domain+name combo the result belongs to, so if
  // the customer edits the name after checking, the stale ✓/✗ badge is
  // invalidated automatically instead of misleadingly staying green.
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'unverified'>('idle');
  const [checkedFor, setCheckedFor] = useState<string | null>(null);
  // NEW: wallet credit (from a previous refund) that can be used to skip
  // Cashfree entirely if it fully covers the order amount.
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletCredit, setUseWalletCredit] = useState(false);

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/wallet');
      if (data.success) setWalletBalance(data.data.balance);
    } catch { /* Non-critical — the order form still works without this */ }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/my');
      if (data.success) setOrders(data.data);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); fetchSettings(); fetchWallet(); }, []);

  const canUseWalletCredit = walletBalance > 0 && Number(amount) > 0;
  const walletAmountToApply = canUseWalletCredit ? Math.min(walletBalance, Number(amount) || 0) : 0;
  const remainingToPay = Math.max(0, (Number(amount) || 0) - (useWalletCredit ? walletAmountToApply : 0));

  const resetModal = () => {
    setService(''); setDomain(''); setEmailType('random'); setCustomLocal('');
    setAmount(''); setPhone(''); setUseWalletCredit(false);
    setCheckStatus('idle'); setCheckedFor(null);
  };

  const currentCombo = domain && customLocal.trim() ? `${customLocal.trim().toLowerCase()}@${domain}` : null;
  // True once a check has actually run for the EXACT combo currently in the
  // inputs — editing the name/domain after a check silently un-verifies it.
  const isCheckedForCurrent = checkedFor !== null && checkedFor === currentCombo;

  const checkEmail = async () => {
    if (!domain || !customLocal.trim()) { toast.error('Select a domain and enter a name first.'); return; }
    setCheckStatus('checking');
    try {
      const { data } = await api.post('/orders/check-email', { domain, customLocalPart: customLocal.trim() });
      setCheckedFor(currentCombo);
      if (!data.data.checked) setCheckStatus('unverified');
      else setCheckStatus(data.data.available ? 'available' : 'taken');
    } catch (err: any) {
      setCheckedFor(null);
      setCheckStatus('idle');
      toast.error(err.response?.data?.message || 'Could not check right now — try again.');
    }
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service.trim()) { toast.error('Enter a service name.'); return; }
    if (!domain) { toast.error('Select an email domain.'); return; }
    if (emailType === 'custom' && !customLocal.trim()) { toast.error('Enter your custom email name.'); return; }
    if (emailType === 'custom' && (!isCheckedForCurrent || checkStatus === 'taken')) {
      toast.error(checkStatus === 'taken'
        ? 'This email is already taken — choose a different name.'
        : 'Click "Check" to verify this email is available before paying.');
      return;
    }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < minimumOrderAmount) {
      toast.error(`Minimum order amount is ₹${minimumOrderAmount}.`);
      return;
    }
    if (!user?.phone && !/^[6-9]\d{9}$/.test(phone)) { toast.error('Enter a valid 10-digit phone number.'); return; }

    setCreating(true);
    try {
      const { data } = await api.post('/orders', {
        serviceName: service,
        domain,
        emailType,
        customLocalPart: emailType === 'custom' ? customLocal.trim() : undefined,
        amount: numAmount,
        ...(user?.phone ? {} : { phone }),
        ...(canUseWalletCredit && useWalletCredit ? { useWalletCredit: true } : {}),
      });

      if (data.success) {
        if (!user?.phone && phone) updateUser({ phone });
        if (data.data.paidWithWallet) {
          // Fully covered by wallet credit — no Cashfree redirect needed,
          // the order is already live in the marketplace.
          toast.success('Paid with wallet credit! Your order is live in the marketplace.');
          setShowModal(false);
          resetModal();
          setCreating(false);
          fetchOrders();
          fetchWallet();
        } else {
          if (data.data.walletAmountApplied > 0) {
            toast.info(`${formatCurrency(data.data.walletAmountApplied)} wallet credit applied — complete the rest to publish your order.`);
            fetchWallet();
          } else {
            toast.success('Redirecting to payment…');
          }
          await openCashfreeCheckout(data.data.paymentSessionId);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order.');
      setCreating(false);
    }
  };

  const previewEmail = domain && emailType === 'custom' && customLocal.trim()
    ? `${customLocal.trim().toLowerCase()}@${domain}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-gray-400">No orders yet</p>
            <p className="text-sm mt-1">Place your first order to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Order ID','Service','Amount','Status','Date',''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-white/[0.05] transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{shortId(o._id)}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{o.serviceName}</td>
                  <td className="px-4 py-3 text-gray-300">{o.amount !== undefined ? formatCurrency(o.amount) : '—'}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{timeAgo(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/customer/orders/${o._id}`}
                      className="text-xs text-purple-400 hover:text-purple-300">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) resetModal(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Place New Order</DialogTitle></DialogHeader>
          <form onSubmit={createOrder} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service description</Label>
              <Input placeholder="e.g. Instagram login verification" value={service}
                onChange={e => setService(e.target.value)} autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Order amount
              </Label>
              <Input
                type="number"
                min={minimumOrderAmount}
                placeholder={`Minimum ₹${minimumOrderAmount}`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                {100 - platformCommissionRate}% goes to the worker who completes your order, {platformCommissionRate}% is the platform fee.
              </p>
            </div>

            {walletBalance > 0 && (
              <div className={cn(
                'p-3 rounded-xl border flex items-center justify-between gap-3',
                'border-green-500/30 bg-green-500/5'
              )}>
                <div>
                  <p className="text-sm text-white font-medium">Wallet credit: {formatCurrency(walletBalance)}</p>
                  <p className="text-xs text-gray-500">
                    {walletAmountToApply >= (Number(amount) || 0) && Number(amount) > 0
                      ? 'Covers this order fully — no payment needed!'
                      : `Apply ${formatCurrency(walletAmountToApply)} — pay ${formatCurrency(remainingToPay)} via Cashfree for the rest.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseWalletCredit(v => !v)}
                  className={cn(
                    'shrink-0 w-11 h-6 rounded-full transition-colors relative',
                    useWalletCredit ? 'bg-green-500' : 'bg-white/[0.12]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                    useWalletCredit ? 'translate-x-[22px]' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Email domain</Label>
              <div className="grid grid-cols-3 gap-2">
                {EMAIL_DOMAINS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDomain(d)}
                    className={cn(
                      'relative flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all truncate',
                      domain === d
                        ? 'border-purple-500 bg-purple-600/10 text-white'
                        : 'border-white/[0.06] text-gray-400 hover:border-white/[0.15] hover:text-gray-200'
                    )}
                  >
                    {domain === d && <Check className="w-3 h-3 text-purple-400 shrink-0" />}
                    <span className="truncate">@{d}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email type</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEmailType('random')}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                    emailType === 'random' ? 'border-purple-500 bg-purple-600/10 text-white' : 'border-white/[0.06] text-gray-400 hover:border-white/[0.15]'
                  )}>
                  <Shuffle className={cn('w-5 h-5', emailType === 'random' ? 'text-purple-400' : 'text-gray-500')} />
                  <span className="font-medium text-sm">Random</span>
                  <span className="text-xs text-gray-500 text-center">Auto-generated</span>
                </button>
                <button type="button" onClick={() => setEmailType('custom')}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                    emailType === 'custom' ? 'border-purple-500 bg-purple-600/10 text-white' : 'border-white/[0.06] text-gray-400 hover:border-white/[0.15]'
                  )}>
                  <Edit3 className={cn('w-5 h-5', emailType === 'custom' ? 'text-purple-400' : 'text-gray-500')} />
                  <span className="font-medium text-sm">Custom</span>
                  <span className="text-xs text-gray-500 text-center">You choose the name</span>
                </button>
              </div>
            </div>

            {emailType === 'custom' && (
              <div className="space-y-1.5">
                <Label>Custom email name</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="yourtext"
                    value={customLocal}
                    onChange={e => {
                      setCustomLocal(e.target.value);
                      // Editing after a check invalidates that result — the
                      // badge disappears until they hit Check again.
                      if (checkStatus !== 'checking') setCheckStatus('idle');
                    }}
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm whitespace-nowrap">@{domain || '...'}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!domain || !customLocal.trim() || checkStatus === 'checking'}
                    onClick={checkEmail}
                  >
                    {checkStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                  </Button>
                </div>

                {isCheckedForCurrent && checkStatus === 'available' && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Available — you're good to pay.
                  </p>
                )}
                {isCheckedForCurrent && checkStatus === 'taken' && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Already taken — try a different name.
                  </p>
                )}
                {isCheckedForCurrent && checkStatus === 'unverified' && (
                  <p className="text-xs text-yellow-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Couldn't verify right now — you can still continue.
                  </p>
                )}
              </div>
            )}

            {previewEmail && (
              <div className="p-3 rounded-xl bg-white/[0.05] text-sm">
                <span className="text-gray-500">Email to be created: </span>
                <span className="text-white font-mono break-all">{previewEmail}</span>
              </div>
            )}
            {emailType === 'random' && domain && (
              <p className="text-xs text-gray-500">
                Any @{domain} account works — the worker will provide one (new or already made) and share its login with you.
              </p>
            )}

            {!user?.phone && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone number
                </Label>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
                <p className="text-xs text-gray-500">Required by our payment partner. Saved to your profile for next time.</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button
                type="submit"
                loading={creating}
                disabled={emailType === 'custom' && (!isCheckedForCurrent || checkStatus === 'taken')}
              >
                {useWalletCredit && canUseWalletCredit
                  ? remainingToPay === 0
                    ? 'Pay with Wallet Credit & Place Order'
                    : `Pay ${formatCurrency(remainingToPay)} (Wallet Credit Applied) & Place Order`
                  : amount ? `Pay ${formatCurrency(Number(amount) || 0)} & Place Order` : 'Continue to Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
