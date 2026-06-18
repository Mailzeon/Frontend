'use client';
import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Clock, ArrowDownLeft } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function WorkerWalletPage() {
  const [wallet, setWallet]         = useState<any>(null);
  const [txns, setTxns]             = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod]         = useState<'upi' | 'bank'>('upi');
  const [amount, setAmount]         = useState('');
  const [upiId, setUpiId]           = useState('');
  const [bank, setBank]             = useState({ accountHolder: '', accountNumber: '', ifscCode: '', bankName: '' });

  const fetchAll = async () => {
    try {
      const [w, t, wr] = await Promise.allSettled([
        api.get('/wallet'), api.get('/wallet/transactions'), api.get('/withdrawals/my')
      ]);
      if (w.status === 'fulfilled')  setWallet(w.value.data.data);
      if (t.status === 'fulfilled')  setTxns(t.value.data.data || []);
      if (wr.status === 'fulfilled') setWithdrawals(wr.value.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const submitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) < 1) { toast.error('Enter a valid amount.'); return; }
    if (Number(amount) > (wallet?.balance || 0)) { toast.error('Insufficient balance.'); return; }
    if (method === 'upi' && !upiId.trim()) { toast.error('Enter your UPI ID.'); return; }
    if (method === 'bank' && !bank.accountNumber.trim()) { toast.error('Enter bank account number.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/withdrawals', {
        amount: Number(amount), paymentMethod: method,
        ...(method === 'upi' ? { upiId } : { bankDetails: bank }),
      });
      if (data.success) {
        toast.success('Withdrawal requested! Will be processed within 24 hours.');
        setShowWithdraw(false); setAmount('');
        fetchAll();
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400', approved: 'text-blue-400',
    completed: 'text-green-400', rejected: 'text-red-400'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet & Earnings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your earnings and withdrawals</p>
        </div>
        <Button onClick={() => setShowWithdraw(true)} disabled={!wallet || wallet.balance < 1}>
          <ArrowDownLeft className="w-4 h-4 mr-2" /> Withdraw
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">{Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Available Balance" value={formatCurrency(wallet?.balance ?? 0)}        icon={Wallet}       color="green" />
          <StatCard title="Pending"           value={formatCurrency(wallet?.pendingBalance ?? 0)} icon={Clock}        color="yellow" />
          <StatCard title="Total Earned"      value={formatCurrency(wallet?.totalEarned ?? 0)}    icon={TrendingUp}   color="purple" />
        </div>
      )}

      {/* Transactions */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[#374151]">
          <h2 className="font-semibold text-white">Transaction History</h2>
        </div>
        {txns.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-[#374151]/50">
            {txns.map(t => (
              <div key={t._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{t.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(t.createdAt)}</p>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '−'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawals */}
      {withdrawals.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-[#374151]">
            <h2 className="font-semibold text-white">Withdrawal Requests</h2>
          </div>
          <div className="divide-y divide-[#374151]/50">
            {withdrawals.map(w => (
              <div key={w._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{formatCurrency(w.amount)} via {w.paymentMethod.toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{formatDate(w.createdAt)}</p>
                </div>
                <span className={`text-xs font-semibold capitalize ${statusColor[w.status]}`}>{w.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw modal */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw Earnings</DialogTitle></DialogHeader>
          <form onSubmit={submitWithdrawal} className="space-y-4">
            <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 text-sm text-gray-300">
              Available: <span className="text-green-400 font-bold">{formatCurrency(wallet?.balance ?? 0)}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} min="1" max={wallet?.balance} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={v => setMethod(v as 'upi' | 'bank')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method === 'upi' ? (
              <div className="space-y-1.5">
                <Label>UPI ID</Label>
                <Input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ['Account Holder Name', 'accountHolder', 'Full name'],
                  ['Account Number', 'accountNumber', '1234567890'],
                  ['IFSC Code', 'ifscCode', 'SBIN0001234'],
                  ['Bank Name', 'bankName', 'State Bank of India'],
                ].map(([label, key, ph]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input placeholder={ph} value={(bank as any)[key]} onChange={e => setBank(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">Withdrawals are processed manually within 24 hours by admin.</p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowWithdraw(false)}>Cancel</Button>
              <Button type="submit" loading={submitting}>Request Withdrawal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
