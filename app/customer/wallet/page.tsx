'use client';
import { useState, useEffect } from 'react';
import { Wallet, ArrowDownLeft } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomerWalletPage() {
  const [txns, setTxns]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]   = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/orders/my');
        if (data.success) {
          const completed = data.data.filter((o: any) => o.status === 'completed');
          setTotal(completed.reduce((sum: number, o: any) => sum + o.amount, 0));
          setTxns(completed.map((o: any) => ({ ...o, type: 'payment' })));
        }
      } catch { toast.error('Failed to load wallet.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Wallet</h1>
        <p className="text-gray-400 text-sm mt-0.5">Your payment history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total Spent"     value={formatCurrency(total)} icon={Wallet} color="purple" />
        <StatCard title="Orders Paid"     value={txns.length}           icon={ArrowDownLeft} color="blue" />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[#374151]">
          <h2 className="font-semibold text-white">Payment History</h2>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">{Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : txns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No payments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[#374151]/50">
            {txns.map(t => (
              <div key={t._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{t.serviceName}</p>
                  <p className="text-xs text-gray-500">{formatDate(t.completedAt || t.createdAt)}</p>
                </div>
                <span className="text-sm font-semibold text-red-400">−{formatCurrency(t.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
