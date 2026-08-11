'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { CreateOrderModal } from '@/components/shared/CreateOrderModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, timeAgo, formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
import Link from 'next/link';

export default function CustomerOrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/my');
      if (data.success) setOrders(data.data);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

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

      <CreateOrderModal open={showModal} onOpenChange={setShowModal} onOrderCreated={fetchOrders} />
    </div>
  );
}
