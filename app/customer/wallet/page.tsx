'use client';
import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomerWalletPage() {
  const [balance, setBalance]   = useState(0);
  const [txns, setTxns]         = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
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
    };
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Wallet</h1>
        <p className="text-gray-400 text-sm mt-0.5">Your credit balance and payment history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Wallet Credit"   value={formatCurrency(balance)}    icon={WalletIcon}    color="green" />
        <StatCard title="Total Spent"     value={formatCurrency(totalSpent)} icon={ArrowUpRight}  color="purple" />
      </div>

      {balance > 0 && (
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
          <p className="text-sm text-green-400">
            💰 You have {formatCurrency(balance)} in wallet credit from previous refunds — it'll be
            offered automatically next time you place an order that costs the same or less.
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
                    t.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {t.type === 'credit'
                      ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                      : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '−'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
