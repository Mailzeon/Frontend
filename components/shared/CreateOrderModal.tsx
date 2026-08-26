'use client';
/**
 * Order-creation modal, used from BOTH /customer/dashboard and
 * /customer/orders.
 *
 * This used to be two separate, hand-copied implementations of the same
 * form — one per page. That's exactly how the pre-payment "Check" button
 * only ever got added to ONE of them: a fix to one copy silently never
 * reached the other. Consolidated into a single component so there is now
 * only one place to ever fix or extend this form again.
 */
import { useState, useEffect } from 'react';
import { Shuffle, Edit3, Check, IndianRupee, Phone, Loader2, XCircle, AlertTriangle, Layers, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { EMAIL_DOMAINS } from '@/lib/emailDomains';
import { openCashfreeCheckout } from '@/lib/cashfree';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after an order is successfully created (wallet-paid path only —
   *  the Cashfree redirect path navigates away, so there's nothing to
   *  refresh in-page for that one). Use this to refetch the order list. */
  onOrderCreated: () => void;
}

export function CreateOrderModal({ open, onOpenChange, onOrderCreated }: CreateOrderModalProps) {
  const { user, updateUser } = useAuthStore();
  const { minimumOrderAmount, platformCommissionRate } = useSettingsStore();
  const [creating, setCreating] = useState(false);

  const [service, setService]     = useState('');
  const [domain, setDomain]       = useState('');
  const [emailType, setEmailType] = useState<'random' | 'custom'>('random');
  const [customLocal, setCustomLocal] = useState('');
  const [amount, setAmount]       = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletCredit, setUseWalletCredit] = useState(false);

  // ── Bulk ordering ──────────────────────────────────────────────────────
  // Same service/domain/email-type/price for every account in the batch —
  // only the QUANTITY (random) or the LIST of custom names (custom)
  // varies per account. Each becomes its own fully independent order on
  // the backend (see order.service.ts createBulkOrder()) — this toggle
  // only changes how the FORM collects the input, not what gets created.
  const [bulkMode, setBulkMode]   = useState(false);
  const [quantity, setQuantity]   = useState('');
  // One name per line — parsed on submit, not on every keystroke, so a
  // customer mid-typing a line doesn't see the count/validation flicker.
  const [bulkNames, setBulkNames] = useState('');

  // Pre-payment "Check" button state for custom emails. `checkedFor`
  // remembers exactly which domain+name combo the result belongs to, so if
  // the customer edits the name after checking, the stale ✓/✗ badge is
  // invalidated automatically instead of misleadingly staying green.
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'unverified'>('idle');
  const [checkedFor, setCheckedFor] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/wallet');
      if (data.success) setWalletBalance(data.data.balance);
    } catch { /* Non-critical — the order form still works without this */ }
  };

  // BUG FIX: this used to only fetch on the modal's OWN onOpenChange
  // callback — but the "New Order" button on the dashboard/orders page
  // opens the modal by calling its OWN setShowModal(true) directly, which
  // never goes through onOpenChange at all. Net effect: walletBalance
  // silently stayed 0 forever, so the "pay with wallet credit" toggle
  // never appeared even for a customer who genuinely had a balance. A
  // plain effect watching the `open` prop fires no matter how the modal
  // got opened.
  useEffect(() => {
    if (open) fetchWallet();
  }, [open]);

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) resetModal();
  };

  const parsedBulkNames = bulkNames
    .split(/[\n,]/)
    .map(n => n.trim().toLowerCase())
    .filter(Boolean);
  // Custom bulk mode derives quantity straight from however many names were
  // typed — no separate quantity field to keep in sync with the list (and
  // no chance of the two disagreeing). Random bulk mode has no list to
  // count, so it needs its own quantity input.
  const numQuantity = bulkMode && emailType === 'custom' ? parsedBulkNames.length : Number(quantity) || 0;

  // Bulk mode charges against the TOTAL (amount × quantity), not the
  // per-account amount — everything downstream (wallet toggle, the "Pay
  // ₹X" button label) needs to reflect what actually gets charged.
  const effectiveTotal = bulkMode ? (Number(amount) || 0) * numQuantity : (Number(amount) || 0);
  const canUseWalletCredit = walletBalance > 0 && effectiveTotal > 0;
  const walletAmountToApply = canUseWalletCredit ? Math.min(walletBalance, effectiveTotal) : 0;
  const remainingToPay = Math.max(0, effectiveTotal - (useWalletCredit ? walletAmountToApply : 0));

  const resetModal = () => {
    setService(''); setDomain(''); setEmailType('random'); setCustomLocal('');
    setAmount(''); setUseWalletCredit(false);
    setCheckStatus('idle'); setCheckedFor(null);
    setBulkMode(false); setQuantity(''); setBulkNames('');
  };

  const currentCombo = domain && customLocal.trim() ? `${customLocal.trim().toLowerCase()}@${domain}` : null;
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

    if (!bulkMode && emailType === 'custom' && !customLocal.trim()) { toast.error('Enter your custom email name.'); return; }
    if (!bulkMode && emailType === 'custom' && (!isCheckedForCurrent || checkStatus === 'taken')) {
      toast.error(checkStatus === 'taken'
        ? 'This email is already taken — choose a different name.'
        : 'Click "Check" to verify this email is available before paying.');
      return;
    }

    if (bulkMode) {
      if (numQuantity < 2) {
        toast.error(emailType === 'custom'
          ? 'Enter at least 2 names, one per line, for a bulk custom order.'
          : 'Enter a quantity of at least 2 for bulk orders.');
        return;
      }
      if (emailType === 'custom') {
        const dupes = parsedBulkNames.filter((n, i) => parsedBulkNames.indexOf(n) !== i);
        if (dupes.length > 0) {
          toast.error(`Duplicate names: ${Array.from(new Set(dupes)).join(', ')} — each account needs a unique name.`);
          return;
        }
      }
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < minimumOrderAmount) {
      toast.error(`Minimum amount is ₹${minimumOrderAmount}${bulkMode ? ' per account' : ''}.`);
      return;
    }
    // Phone is now mandatory + verified at registration/profile level (see
    // ProfilePage.tsx) — no longer collected here. An existing customer
    // from before this was required gets stopped with a clear message
    // instead of a phone input field.
    if (!user?.phoneVerified) {
      toast.error('Please verify your phone number in your profile before placing an order.');
      return;
    }

    setCreating(true);
    try {
      const { data } = bulkMode
        ? await api.post('/orders/bulk', {
            serviceName: service,
            domain,
            emailType,
            quantity: numQuantity,
            customLocalParts: emailType === 'custom' ? parsedBulkNames : undefined,
            amount: numAmount,
            ...(canUseWalletCredit && useWalletCredit ? { useWalletCredit: true } : {}),
          })
        : await api.post('/orders', {
            serviceName: service,
            domain,
            emailType,
            customLocalPart: emailType === 'custom' ? customLocal.trim() : undefined,
            amount: numAmount,
            ...(canUseWalletCredit && useWalletCredit ? { useWalletCredit: true } : {}),
          });

      if (data.success) {
        if (data.data.paidWithWallet) {
          // Fully covered by wallet credit — no Cashfree redirect needed,
          // the order(s) are already live in the marketplace.
          toast.success(bulkMode
            ? `Paid with wallet credit! Your ${numQuantity} orders are live in the marketplace.`
            : 'Paid with wallet credit! Your order is live in the marketplace.');
          onOpenChange(false);
          resetModal();
          setCreating(false);
          onOrderCreated();
        } else {
          if (data.data.walletAmountApplied > 0) {
            toast.info(`${formatCurrency(data.data.walletAmountApplied)} wallet credit applied — complete the rest to publish your order${bulkMode ? 's' : ''}.`);
          } else {
            toast.success('Redirecting to payment…');
          }
          // Order(s) created but NOT yet in the marketplace — they only
          // become visible to workers once Cashfree confirms payment.
          // Cashfree's return_url was already set server-side to the right
          // destination for bulk vs single (see order.service.ts
          // createBulkOrder() / payment.service.ts createCashfreeOrder()) —
          // bulk batches land back on the orders LIST, not a single order's
          // detail page, since N separate orders result from one payment.
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Place New Order</DialogTitle></DialogHeader>
        <form onSubmit={createOrder} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Service description</Label>
            <Input placeholder="e.g. Instagram login verification" value={service}
              onChange={e => setService(e.target.value)} autoFocus />
          </div>

          {/* Bulk ordering toggle — same service/domain/price for every
              account, only quantity (random) or the list of names (custom)
              differs. Each becomes its own fully independent order on the
              backend (see order.service.ts createBulkOrder()). */}
          <button
            type="button"
            onClick={() => setBulkMode(v => !v)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
              bulkMode ? 'border-purple-500 bg-purple-600/10' : 'border-white/[0.06] hover:border-white/[0.15]'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              bulkMode ? 'bg-purple-500/20' : 'bg-white/[0.05]'
            )}>
              <Layers className={cn('w-4 h-4', bulkMode ? 'text-purple-400' : 'text-gray-500')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', bulkMode ? 'text-white' : 'text-gray-300')}>Bulk order</p>
              <p className="text-xs text-gray-500">Order multiple accounts at once — each is placed separately in the marketplace</p>
            </div>
            <div className={cn(
              'shrink-0 w-11 h-6 rounded-full transition-colors relative',
              bulkMode ? 'bg-purple-500' : 'bg-white/[0.12]'
            )}>
              <span className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                bulkMode ? 'translate-x-[22px]' : 'translate-x-0.5'
              )} />
            </div>
          </button>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5" /> {bulkMode ? 'Amount per account' : 'Order amount'}
            </Label>
            <Input
              type="number"
              min={minimumOrderAmount}
              placeholder={`Minimum ₹${minimumOrderAmount}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              {100 - platformCommissionRate}% goes to the worker who completes {bulkMode ? 'each' : 'your'} order, {platformCommissionRate}% is the platform fee.
            </p>
          </div>

          {bulkMode && emailType === 'random' && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Quantity
              </Label>
              <Input
                type="number"
                min={2}
                placeholder="e.g. 20"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
          )}

          {bulkMode && numQuantity >= 2 && Number(amount) > 0 && (
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
              <span className="text-sm text-gray-300">{numQuantity} accounts × {formatCurrency(Number(amount))}</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(effectiveTotal)} total</span>
            </div>
          )}

          {walletBalance > 0 && (
            <div className={cn(
              'p-3 rounded-xl border flex items-center justify-between gap-3',
              'border-green-500/30 bg-green-500/5'
            )}>
              <div>
                <p className="text-sm text-white font-medium">Wallet credit: {formatCurrency(walletBalance)}</p>
                <p className="text-xs text-gray-500">
                  {walletAmountToApply >= effectiveTotal && effectiveTotal > 0
                    ? `Covers ${bulkMode ? 'this batch' : 'this order'} fully — no payment needed!`
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

          {emailType === 'custom' && !bulkMode && (
            <div className="space-y-1.5">
              <Label>Custom email name</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="yourtext"
                  value={customLocal}
                  onChange={e => {
                    setCustomLocal(e.target.value);
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

          {emailType === 'custom' && bulkMode && (
            <div className="space-y-1.5">
              <Label>Custom email names — one per line</Label>
              <textarea
                placeholder={`shopfront1\nshopfront2\nshopfront3`}
                value={bulkNames}
                onChange={e => setBulkNames(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-gray-600 text-sm font-mono focus:outline-none focus:border-purple-500/50 resize-y"
              />
              <p className="text-xs text-gray-500">
                {parsedBulkNames.length > 0
                  ? `${parsedBulkNames.length} name${parsedBulkNames.length !== 1 ? 's' : ''} entered — each becomes its own @${domain || '...'} order. Availability is checked when you pay.`
                  : `One name per line — each becomes its own @${domain || '...'} order.`}
              </p>
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

          {!user?.phoneVerified && (
            <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400">
                You need a verified phone number to place an order.{' '}
                <a href={`/${user?.role}/profile`} className="underline font-medium">Add one in your profile</a> — it only takes a moment.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              loading={creating}
              disabled={
                !user?.phoneVerified ||
                (!bulkMode && emailType === 'custom' && (!isCheckedForCurrent || checkStatus === 'taken')) ||
                (bulkMode && numQuantity < 2)
              }
            >
              {useWalletCredit && canUseWalletCredit
                ? remainingToPay === 0
                  ? `Pay with Wallet Credit & Place ${bulkMode ? `${numQuantity} Orders` : 'Order'}`
                  : `Pay ${formatCurrency(remainingToPay)} (Wallet Credit Applied) & Place ${bulkMode ? `${numQuantity} Orders` : 'Order'}`
                : effectiveTotal > 0
                  ? `Pay ${formatCurrency(effectiveTotal)} & Place ${bulkMode ? `${numQuantity} Orders` : 'Order'}`
                  : 'Continue to Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
