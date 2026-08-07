'use client';
import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, IndianRupee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

const TABS: { value: string; label: string }[] = [
  { value: '',           label: 'All' },
  { value: 'recharge',   label: 'Recharges' },
  { value: 'credit',     label: 'Credits / Refunds' },
  { value: 'debit',      label: 'Debits' },
  { value: 'withdrawal', label: 'Withdrawals' },
];

const TYPE_LABEL: Record<string, string> = {
  recharge: 'Recharge', credit: 'Credit', debit: 'Debit', withdrawal: 'Withdrawal',
};

export default function AdminWalletPage() {
  const [txns, setTxns]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('');

  const fetchTxns = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/wallet-transactions', { params: type ? { type } : {} });
      if (data.success) setTxns(data.data);
    } catch { toast.error('Failed to load wallet transactions.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxns(tab); }, [tab, fetchTxns]);

  const isCredit = (t: any) => t.type === 'credit' || t.type === 'recharge';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Wallet Transactions</h1>
        <p className="text-gray-400 text-sm mt-0.5">Monitor recharges, refunds, earnings & withdrawals across every user</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === t.value ? 'bg-purple-600 text-white' : 'bg-white/[0.05] text-gray-400 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(6).fill(0).map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : txns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No transactions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {txns.map((t: any) => (
              <div key={t._id} className="flex items-center justify-between px-4 py-3 gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    t.status === 'failed' ? 'bg-gray-500/10' : isCredit(t) ? 'bg-green-500/10' : 'bg-red-500/10'
                  )}>
                    {t.status === 'failed'
                      ? <ArrowUpRight className="w-4 h-4 text-gray-500" />
                      : t.type === 'recharge'
                        ? <IndianRupee className="w-4 h-4 text-green-400" />
                        : isCredit(t)
                          ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                          : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {t.userId?.name ?? 'Unknown user'}
                      <span className="text-gray-500 font-normal"> · {t.userId?.email}</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {TYPE_LABEL[t.type] ?? t.type} — {t.description}
                    </p>
                    <p className="text-xs text-gray-600">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'text-sm font-semibold',
                    t.status === 'failed' ? 'text-gray-500' :
                    isCredit(t) ? 'text-green-400' : 'text-red-400'
                  )}>
                    {isCredit(t) ? '+' : '−'}{formatCurrency(t.amount)}
                  </p>
                  <p className={cn(
                    'text-xs',
                    t.status === 'completed' ? 'text-green-500/70' :
                    t.status === 'pending' ? 'text-yellow-500/70' : 'text-red-500/70'
                  )}>
                    {t.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
