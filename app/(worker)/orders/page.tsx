'use client';
import { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, timeAgo, formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
import Link from 'next/link';

export default function WorkerOrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/orders/assigned');
        if (data.success) setOrders(data.data);
      } catch { toast.error('Failed to load orders.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const active    = orders.filter(o => !['completed','cancelled'].includes(o.status));
  const completed = orders.filter(o => o.status === 'completed');

  const Table = ({ items }: { items: Order[] }) => (
    <div className="glass-card overflow-hidden">
      {items.length === 0 ? (
        <p className="text-center py-8 text-sm text-gray-500">None yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#374151]">
              {['ID','Service','Earnings','Status','Date',''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#374151]/50">
            {items.map(o => (
              <tr key={o._id} className="hover:bg-[#374151]/20 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-400 text-xs">{shortId(o._id)}</td>
                <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{o.serviceName}</td>
                <td className="px-4 py-3 text-green-400 font-semibold">+{formatCurrency(o.workerEarning)}</td>
                <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-gray-500">{timeAgo(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/worker/orders/${o._id}`} className="text-xs text-purple-400 hover:text-purple-300">
                    {['completed','cancelled'].includes(o.status) ? 'View' : 'Work →'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Orders</h1>
        <p className="text-gray-400 text-sm mt-0.5">{orders.length} total orders</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Active ({active.length})
            </h2>
            <Table items={active} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Completed ({completed.length})
            </h2>
            <Table items={completed} />
          </div>
        </>
      )}
    </div>
  );
}
