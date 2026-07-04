'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, timeAgo, formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
import Link from 'next/link';

export default function CustomerOrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [service, setService]   = useState('');
  const [creating, setCreating] = useState(false);
  // FIX: was hardcoded ₹50 — now reflects the live admin-configured price.
  const [orderPrice, setOrderPrice] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/my');
      if (data.success) setOrders(data.data);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOrders();
    api.get('/settings/public')
      .then(({ data }) => { if (data.success) setOrderPrice(data.data.orderPrice); })
      .catch(() => setOrderPrice(50));
  }, []);

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service.trim()) { toast.error('Enter a service name.'); return; }
    setCreating(true);
    try {
      const { data } = await api.post('/orders', { serviceName: service });
      if (data.success) {
        toast.success('Order placed!');
        setShowModal(false); setService('');
        fetchOrders();
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setCreating(false); }
  };

  const priceLabel = orderPrice !== null ? formatCurrency(orderPrice) : '...';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Order — {priceLabel}
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
              <tr className="border-b border-[#374151]">
                {['Order ID','Service','Amount','Status','Date',''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]/50">
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-[#374151]/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{shortId(o._id)}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{o.serviceName}</td>
                  <td className="px-4 py-3 text-gray-300">{formatCurrency(o.amount)}</td>
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Place New Order</DialogTitle></DialogHeader>
          <form onSubmit={createOrder} className="space-y-4">
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-sm text-gray-300">
              You will be charged <span className="text-purple-400 font-bold">{priceLabel}</span>. A worker will complete your order.
            </div>
            <div className="space-y-1.5">
              <Label>Service description</Label>
              <Input placeholder="e.g. Instagram login verification" value={service}
                onChange={e => setService(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={creating}>Place Order — {priceLabel}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
