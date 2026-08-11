'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { CreateOrderModal } from '@/components/shared/CreateOrderModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, timeAgo, formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
import Link from 'next/link';

export default function CustomerDashboard() {
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

  const stats = {
    total:     orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    active:    orders.filter(o => !['completed','cancelled','payment_failed'].includes(o.status)).length,
    disputes:  orders.filter(o => o.status === 'under_review').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track your orders and activity</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders"    value={stats.total}     icon={ShoppingBag}     color="purple" />
        <StatCard title="Completed"       value={stats.completed} icon={CheckCircle}     color="green" />
        <StatCard title="Active"          value={stats.active}    icon={Clock}           color="blue" />
        <StatCard title="Under Review"    value={stats.disputes}  icon={AlertTriangle}   color="red" />
      </div>

      {/* Recent orders */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Orders</h2>
          <Link href="/customer/orders" className="text-xs text-purple-400 hover:text-purple-300">View all</Link>
        </div>

        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders yet. Place your first order!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0,5).map(o => (
              <Link key={o._id} href={`/customer/orders/${o._id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.05] transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{o.serviceName}</p>
                  <p className="text-xs text-gray-500">{shortId(o._id)} · {timeAgo(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {o.amount !== undefined && (
                    <span className="text-sm font-medium text-gray-300">{formatCurrency(o.amount)}</span>
                  )}
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateOrderModal open={showModal} onOpenChange={setShowModal} onOrderCreated={fetchOrders} />
    </div>
  );
}
