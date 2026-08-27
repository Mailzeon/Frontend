'use client';
import { shortId, timeAgo, formatCurrency, cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Wallet, Wifi, Store } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Order } from '@/types';
import Link from 'next/link';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { useLockStatus } from '@/hooks/useLockStatus';
import { Lock } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
  silver: 'text-gray-300 border-gray-400/30 bg-gray-400/10',
  gold:   'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
};

export default function WorkerDashboard() {
  const { user } = useAuthStore();
  const { isLocked, isPermanent, strikeCount, formattedTime } = useLockStatus();
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [wallet,   setWallet]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  // No toggle anymore — this just reflects the actual live socket
  // connection, the same signal the backend uses to mark you online.
  const [connected, setConnected] = useState(false);

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

    // Listen for new order alerts + reflect the real connection state —
    // this IS what makes you "online" now, nothing else to flip.
    const socket = getSocket();
    if (socket) {
      setConnected(socket.connected);
      const onNew = () => toast.info('🔔 New order available in Marketplace!');
      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);
      socket.on(SOCKET_EVENTS.NEW_ORDER, onNew);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      return () => {
        socket.off(SOCKET_EVENTS.NEW_ORDER, onNew);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }
  }, []);

  const completed = orders.filter(o => o.status === 'completed').length;
  const active    = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const lvl       = (user?.level ?? 'bronze') as 'bronze' | 'silver' | 'gold';

  return (
    <div className="space-y-6">
      {/* Header + online toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Worker Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user?.name}</p>
        </div>

        {/* No toggle — this just reflects whether you're actually
            connected right now. Close the app and it goes gray; reopen it
            and it's green again, automatically. */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-medium text-sm',
            connected
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-[#1C1C24]/50 border-white/[0.06] text-gray-400'
          )}
        >
          <Wifi className="w-5 h-5" />
          {connected ? 'Online' : 'Connecting…'}
        </div>
      </div>

      {/* Approval warning */}
      {!user?.isApproved && (
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-sm text-yellow-400">
          {user?.wasEverApproved ? (
            <>⛔ Your account has been suspended by an admin. Contact support if you believe this is a mistake.</>
          ) : isLocked && !isPermanent ? (
            <>⏳ Your account is temporarily held due to a shared device/network restriction. It will be
              automatically approved in <strong>{formattedTime}</strong> — no action needed.</>
          ) : isPermanent ? (
            <>🚫 Your account could not be approved due to a confirmed policy violation on a linked account.</>
          ) : (
            <>⏳ Your account is pending approval. You will be notified once approved.</>
          )}
        </div>
      )}

      {/* Dispute-strike lock — still shows the level badge and every order
          in the marketplace stays visible; only accepting is blocked. */}
      {isLocked && (
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
          {isPermanent ? (
            <>
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <Lock className="w-4 h-4" /> Account Permanently Banned
              </div>
              <p className="text-sm text-red-300">
                Your account can no longer accept orders. Contact support if you believe this is a mistake.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <Lock className="w-4 h-4" /> Account Locked — Strike {strikeCount}
              </div>
              <p className="text-sm text-red-300">
                A dispute against you was resolved in the customer's favor. You can't accept new orders
                for <span className="font-mono font-semibold">{formattedTime}</span>. Make sure every
                account you deliver is genuine and working — repeated strikes lock you out for longer
                each time.
              </p>
            </>
          )}
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
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.05] transition-colors">
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
