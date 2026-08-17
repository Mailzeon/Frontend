'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, Clock, AlertTriangle, Plus, Wallet as WalletIcon, Store } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { CreateOrderModal } from '@/components/shared/CreateOrderModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, timeAgo, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Order } from '@/types';
import Link from 'next/link';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [wallet, setWallet]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/my');
      if (data.success) setOrders(data.data);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/wallet');
      if (data.success) setWallet(data.data);
    } catch {}
  };

  useEffect(() => { fetchOrders(); fetchWallet(); }, []);

  // Live "credentials ready, go verify" alert — this event already fires
  // from the backend (order.service.ts, same CREDENTIALS_READY the worker
  // dashboard listens for on the NEW_ORDER side), it just wasn't being
  // listened to here yet. Refetch orders on it too so the recent-orders
  // list and stats update without the customer having to manually refresh.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onCredentialsReady = () => {
      toast.info('🔑 Account credentials are ready — verify now!');
      fetchOrders();
    };
    socket.on(SOCKET_EVENTS.CREDENTIALS_READY, onCredentialsReady);
    return () => { socket.off(SOCKET_EVENTS.CREDENTIALS_READY, onCredentialsReady); };
  }, []);

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
          <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user?.name}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      {/* Stats — wallet balance leads, same "money first" priority as the
          worker dashboard's Available Balance card. Previously this was
          buried on the /customer/wallet page only. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Wallet Balance"  value={wallet ? formatCurrency(wallet.balance) : '₹0'} icon={WalletIcon}    color="green" />
        <StatCard title="Total Orders"    value={stats.total}     icon={ShoppingBag}     color="purple" />
        <StatCard title="Completed"       value={stats.completed} icon={CheckCircle}     color="green" />
        <StatCard title="Active"          value={stats.active}    icon={Clock}           color="blue" />
        <StatCard title="Under Review"    value={stats.disputes}  icon={AlertTriangle}   color="red" />
      </div>

      {/* Active orders quick-link — mirrors the worker dashboard's
          "N active orders → Work now" banner. */}
      {stats.active > 0 && (
        <Link href="/customer/orders"
          className="flex items-center justify-between p-4 rounded-xl bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 transition-colors">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-purple-400" />
            <p className="font-medium text-white">You have <span className="text-purple-400">{stats.active} active order{stats.active > 1 ? 's' : ''}</span></p>
          </div>
          <span className="text-purple-400 text-sm">Track now →</span>
        </Link>
      )}

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

