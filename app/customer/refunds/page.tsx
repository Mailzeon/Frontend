'use client';
import { useState, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400',
  completed: 'text-green-400',
  rejected: 'text-red-400',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Processing',
  completed: 'Refunded',
  rejected: 'Rejected',
};

export default function CustomerRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/refunds/my');
        if (data.success) setRefunds(data.data);
      } catch { toast.error('Failed to load refund requests.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Refunds</h1>
        <p className="text-gray-400 text-sm mt-0.5">{refunds.length} refund request{refunds.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Undo2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-gray-400">No refund requests yet</p>
            <p className="text-sm mt-1">Refunds appear here after a dispute is resolved in your favor.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#374151]/50">
            {refunds.map(r => (
              <div key={r._id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-white">{r.orderId?.serviceName ?? 'Order'}</p>
                  <p className="text-xs text-gray-500">{formatDate(r.createdAt)} · UPI: {r.upiId}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{formatCurrency(r.amount)}</p>
                  <p className={`text-xs font-semibold ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Refund requests are created from a cancelled order&apos;s detail page.{' '}
        <Link href="/customer/orders" className="text-purple-400 hover:text-purple-300">View your orders →</Link>
      </p>
    </div>
  );
}
