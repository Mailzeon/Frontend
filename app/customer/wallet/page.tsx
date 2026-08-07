'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus, IndianRupee } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { openCashfreeCheckout } from '@/lib/cashfree';
import { useAuthStore } from '@/store/authStore';

const QUICK_AMOUNTS = [100, 200, 500, 1000];
const MIN_RECHARGE = 1;

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser } = useAuthStore();

  const [balance, setBalance]   = useState(0);
  const [txns, setTxns]         = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [verifyingReturn, setVerifyingReturn] = useState(false);

  const [showAddFunds, setShowAddFunds] = useState(false);
  const [amount, setAmount]     = useState('');
  const [phone, setPhone]       = useState('');
  const [recharging, setRecharging] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [walletRes, txnRes, ordersRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
        api.get('/orders/my'),
      ]);
      if (walletRes.data.success) setBalance(walletRes.data.data.balance);
      if (txnRes.data.success) setTxns(txnRes.data.data);
      if (ordersRes.data.success) {
        const completed = ordersRes.data.data.filter((o: any) => o.status === 'completed');
        setTotalSpent(completed.reduce((sum: number, o: any) => sum + o.amount, 0));
      }
    } catch { toast.error('Failed to load wallet.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Cashfree redirects back here with ?payment=return&txn=<transactionId>
  // after the customer completes (or abandons) checkout for a recharge.
  // Double-check status directly as a fast fallback in case the webhook
  // hasn't landed yet — same pattern as order payment verification.
  useEffect(() => {
    const isReturn = searchParams.get('payment') === 'return';
    const txnId = searchParams.get('txn');
    if (!isReturn || !txnId) return;

    const verify = async () => {
      setVerifyingReturn(true);
      try {
        const { data } = await api.get(`/payments/verify-recharge/${txnId}`);
        if (data.success && data.data.status === 'completed') {
          toast.success('Wallet recharged successfully!');
        } else if (data.success && data.data.status === 'failed') {
          toast.error('Recharge payment did not go through.');
        }
      } catch {
        // Non-fatal — webhook may still resolve it; just refresh below.
      } finally {
        router.replace('/customer/wallet');
        await fetchAll();
        setVerifyingReturn(false);
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddFunds = () => {
    setAmount('');
    setPhone(user?.phone || '');
    setShowAddFunds(true);
  };

  const submitRecharge = async () => {
    const amt = Number(amount);
    if (!amt || amt < MIN_RECHARGE) {
      toast.error(`Minimum recharge amount is ${formatCurrency(MIN_RECHARGE)}.`);
      return;
    }
    if (!user?.phone && !/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Enter a valid 10-digit phone number.');
      return;
    }
    setRecharging(true);
    try {
      const { data } = await api.post('/wallet/recharge', {
        amount: amt,
        ...(user?.phone ? {} : { phone }),
      });
      if (data.success) {
        if (!user?.phone && phone) updateUser({ phone });
        toast.success('Redirecting to payment…');
        await openCashfreeCheckout(data.data.paymentSessionId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate recharge.');
      setRecharging(false);
    }
  };

  // Whether this transaction ADDS money to the wallet (recharge, credit) vs
  // REMOVES it (debit, withdrawal) — only meaningful for a 'completed'
  // transaction. A 'failed' one never moved any money regardless of type,
  // so it's always shown neutrally (gray), never red/green.
  const isCredit = (type: string) => type === 'credit' || type === 'recharge';

  const iconFor = (t: any) => {
    if (t.status === 'failed') return <ArrowUpRight className="w-4 h-4 text-gray-500" />;
    return isCredit(t.type)
      ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
      : <ArrowUpRight className="w-4 h-4 text-red-400" />;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'pending') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pending</span>;
    }
    if (status === 'failed') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">Failed</span>;
    }
    return null; // 'completed' needs no badge — the colored amount already says it succeeded
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Wallet</h1>
          <p className="text-gray-400 text-sm mt-0.5">Your credit balance and payment history</p>
        </div>
        <Button onClick={openAddFunds}>
          <Plus className="w-4 h-4 mr-2" /> Add Funds
        </Button>
      </div>

      {verifyingReturn && (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
          <p className="text-sm text-blue-400 animate-pulse-soft">Confirming your payment…</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Wallet Credit"   value={formatCurrency(balance)}    icon={WalletIcon}    color="green" />
        <StatCard title="Total Spent"     value={formatCurrency(totalSpent)} icon={ArrowUpRight}  color="purple" />
      </div>

      {balance > 0 && (
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
          <p className="text-sm text-green-400">
            💰 You have {formatCurrency(balance)} in wallet credit — it'll be offered automatically
            next time you place an order that costs the same or less.
          </p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">Transaction History</h2>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">{Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : txns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <WalletIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No wallet activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {txns.map((t: any) => (
              <div key={t._id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    t.status === 'failed' ? 'bg-gray-500/10' : isCredit(t.type) ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {iconFor(t)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      {t.description}
                      <StatusBadge status={t.status} />
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  t.status === 'failed' ? 'text-gray-500' :
                  isCredit(t.type) ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isCredit(t.type) ? '+' : '−'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Funds modal */}
      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Funds to Wallet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="number"
                  min={MIN_RECHARGE}
                  placeholder={`Minimum ${MIN_RECHARGE}`}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] hover:text-white transition-colors"
                  >
                    +₹{a}
                  </button>
                ))}
              </div>
            </div>

            {!user?.phone && (
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
              </div>
            )}

            <Button onClick={submitRecharge} className="w-full" loading={recharging}>
              Proceed to Pay {amount && Number(amount) >= MIN_RECHARGE ? formatCurrency(Number(amount)) : ''}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              You'll be redirected to Cashfree's secure checkout to complete payment.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// useSearchParams() (used above to detect the ?payment=return&txn=... redirect
// from Cashfree) opts the page out of static generation unless wrapped in a
// Suspense boundary — without this, `next build` fails with:
// "useSearchParams() should be wrapped in a suspense boundary".
export default function CustomerWalletPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Wallet</h1>
            <p className="text-gray-400 text-sm mt-0.5">Your credit balance and payment history</p>
          </div>
          <Button disabled><Plus className="w-4 h-4 mr-2" /> Add Funds</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    }>
      <WalletContent />
    </Suspense>
  );
}
