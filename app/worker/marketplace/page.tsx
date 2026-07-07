'use client';
import { timeAgo, formatCurrency, cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Store, Clock, Zap, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Order } from '@/types';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';

export default function WorkerMarketplace() {
  const { user } = useAuthStore();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [workerEarning, setWorkerEarning] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/marketplace');
      if (data.success) setOrders(data.data);
    } catch { toast.error('Failed to load marketplace.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    api.get('/settings/public')
      .then(({ data }) => { if (data.success) setWorkerEarning(data.data.workerEarning); })
      .catch(() => setWorkerEarning(20));

    const socket = getSocket();
    if (!socket) return;
    const onNew = () => { fetchOrders(); toast.info('New order available!'); };
    socket.on(SOCKET_EVENTS.NEW_ORDER, onNew);
    return () => { socket.off(SOCKET_EVENTS.NEW_ORDER, onNew); };
  }, [fetchOrders]);

  const accept = async (orderId: string) => {
    if (!user?.isApproved) { toast.error('Your account is pending admin approval.'); return; }
    if (!user?.isOnline)   { toast.error('You must be online to accept orders. Toggle your status on the dashboard.'); return; }
    setAccepting(orderId);
    try {
      const { data } = await api.patch(`/orders/${orderId}/accept`);
      if (data.success) {
        toast.success('Order accepted! You have 10 minutes to submit credentials.');
        setOrders(prev => prev.filter(o => o._id !== orderId));
        window.location.href = `/worker/orders/${orderId}`;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not accept order.');
      fetchOrders();
    } finally { setAccepting(null); }
  };

  const earningLabel = workerEarning !== null ? formatCurrency(workerEarning) : '...';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} available · Earn {earningLabel} per order
          </p>
        </div>
        <Button variant="outline" onClick={fetchOrders}>Refresh</Button>
      </div>

      {!user?.isApproved && (
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-sm text-yellow-400">
          ⏳ Your account is pending admin approval. You cannot accept orders until approved.
        </div>
      )}

      {!user?.isOnline && user?.isApproved && (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-blue-400">
          💤 You are currently offline. Go to your dashboard and toggle Online to start accepting orders.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : orders.length === 0 ? (
        <div className="glass-card text-center py-16 text-gray-500">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-400">No orders available right now</p>
          <p className="text-sm mt-1">New orders appear here in real-time. Stay online!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o._id}
              className={cn('glass-card p-5 flex items-center justify-between gap-4 transition-all',
                accepting === o._id && 'opacity-60')}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="font-semibold text-white truncate">{o.serviceName}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(o.createdAt)}</span>
                  <span>·</span>
                  <span>Customer pays {formatCurrency(o.amount)}</span>
                </div>
                {/* NEW: show the exact email the worker will need to create */}
                {o.requestedEmail && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-400">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="font-mono truncate">Create: {o.requestedEmail}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500">You earn</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(o.workerEarning)}</p>
                </div>
                <Button
                  onClick={() => accept(o._id)}
                  loading={accepting === o._id}
                  disabled={!user?.isApproved || !user?.isOnline}>
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
