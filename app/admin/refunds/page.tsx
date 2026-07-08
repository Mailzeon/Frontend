'use client';
import { useState, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400',
  completed: 'text-green-400',
  rejected: 'text-red-400',
};

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState<string | null>(null);

  const fetchRefunds = async () => {
    try {
      const { data } = await api.get('/admin/refunds');
      if (data.success) setRefunds(data.data);
    } catch { toast.error('Failed to load refund requests.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRefunds(); }, []);

  const updateStatus = async (id: string, status: 'completed' | 'rejected') => {
    setActing(id + status);
    try {
      const { data } = await api.patch(`/admin/refunds/${id}`, { status });
      if (data.success) {
        toast.success(`Refund marked as ${status}.`);
        setRefunds(p => p.map(r => r._id === id ? { ...r, status } : r));
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(null); }
  };

  const pending = refunds.filter(r => r.status === 'pending');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Refund Requests</h1>
        <p className="text-gray-400 text-sm mt-0.5">{pending.length} pending · {refunds.length} total</p>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Undo2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No refund requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#374151]/50">
            {refunds.map(r => (
              <div key={r._id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-white">{r.customerId?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{r.customerId?.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Order: {r.orderId?.serviceName ?? 'N/A'} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(r.amount)}</p>
                    <p className={`text-xs font-semibold capitalize mt-0.5 ${STATUS_COLOR[r.status]}`}>{r.status}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#374151]/40 text-xs">
                  <p className="text-gray-400"><span className="text-gray-500">UPI ID:</span> {r.upiId}</p>
                </div>

                {r.status === 'pending' && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="success" loading={acting === r._id + 'completed'}
                      onClick={() => updateStatus(r._id, 'completed')}>
                      ✓ Mark Completed (transfer done)
                    </Button>
                    <Button size="sm" variant="destructive" loading={acting === r._id + 'rejected'}
                      onClick={() => updateStatus(r._id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
