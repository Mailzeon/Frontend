'use client';
import { shortId, timeAgo, formatCurrency, cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Wallet, ToggleLeft, ToggleRight, Store } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Order } from '@/types';
import Link from 'next/link';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
  silver: 'text-gray-300 border-gray-400/30 bg-gray-400/10',
  gold:   'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
};

export default function WorkerDashboard() {
  const { user, updateUser } = useAuthStore();
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [wallet,   setWallet]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState(false);
  const isOnline = user?.isOnline ?? false;

  useEffect(() => {
    const fetch = async () => {
      try {
        const [ordersRes, walletRes] = await Promise.allSettled([
          api.get('/orders/assigned'),
          api.get('/wallet'),
        ]);
        if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.data || []);
        if (walletRes.status === 'fulfilled') setWallet(walletRes.value.data.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetch();

    // Listen for new order alerts
    const socket = getSocket();
    if (socket) {
      const onNew = () => toast.info('🔔 New order available in Marketplace!');
      socket.on(SOCKET_EVENTS.NEW_ORDER, onNew);
      return () => { socket.off(SOCKET_EVENTS.NEW_ORDER, onNew); };
    }
  }, []);

  const toggleStatus = async () => {
    if (!user?.isApproved) {
      toast.error('Your account is pending admin approval.');
      return;
    }
    setToggling(true);
    try {
      const newStatus = !isOnline;
      const { data }  = await api.patch('/users/status', { isOnline: newStatus });
      if (data.success) {
        updateUser({ isOnline: newStatus });
        toast.success(data.message);
        const socket = getSocket();
        if (newStatus) socket?.emit('join-marketplace');
        else           socket?.emit('leave-marketplace');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setToggling(false);
    }
  };

  const completed = orders.filter(o => o.status === 'completed').length;
  const active    = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const lvl       = (user?.level ?? 'bronze') as 'bronze' | 'silver' | 'gold';

  return (
    <div className="space-y-6">
      {/* Header + online toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Worker Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user?.name}</p>
        </div>

        <button
          onClick={toggleStatus}
          disabled={toggling}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all duration-200',
            isOnline
              ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
              : 'bg-[#374151]/50 border-[#374151] text-gray-400 hover:text-white hover:bg-[#374151]',
            toggling && 'opacity-60 cursor-wait'
          )}
        >
          {isOnline
            ? <><ToggleRight className="w-5 h-5" /> Online</>
            : <><ToggleLeft  className="w-5 h-5" /> Offline</>}
        </button>
      </div>

      {/* Approval warning */}
      {!user?.isApproved && (
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-sm text-yellow-400">
          ⏳ Your account is pending admin approval. You will be notified once approved.
        </div>
      )}

      {/* Level badge */}
      <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold capitalize', LEVEL_COLORS[lvl])}>
        ● {lvl} Worker
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Available Balance" value={wallet ? formatCurrency(wallet.balance)        : '₹0'} icon={Wallet}       color="green"  />
        <StatCard title="Pending Earnings"  value={wallet ? formatCurrency(wallet.pendingBalance) : '₹0'} icon={Clock}        color="yellow" />
        <StatCard title="Total Earned"      value={wallet ? formatCurrency(wallet.totalEarned)    : '₹0'} icon={Wallet}       color="purple" />
        <StatCard title="Completed Orders"  value={completed}                                             icon={CheckCircle}  color="blue"   />
      </div>

      {/* Active orders quick-link */}
      {active > 0 && (
        <Link href="/worker/orders"
          className="flex items-center justify-between p-4 rounded-xl bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 transition-colors">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-purple-400" />
            <p className="font-medium text-white">You have <span className="text-purple-400">{active} active order{active > 1 ? 's' : ''}</span></p>
          </div>
          <span className="text-purple-400 text-sm">Work now →</span>
        </Link>
      )}

      {/* Recent orders */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Orders</h2>
          <Link href="/worker/orders" className="text-xs text-purple-400 hover:text-purple-300">View all</Link>
        </div>
        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No orders yet. Go online and check the marketplace!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map(o => (
              <Link key={o._id} href={`/worker/orders/${o._id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#374151]/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{o.serviceName}</p>
                  <p className="text-xs text-gray-500">{shortId(o._id)} · {timeAgo(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-green-400">+{formatCurrency(o.workerEarning)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
