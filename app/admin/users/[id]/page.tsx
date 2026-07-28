'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Wallet, Star, ShoppingBag, AlertTriangle, Phone, Mail,
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, shortId } from '@/lib/utils';
import { OrderStatus } from '@/types';

const LEVEL_COLOR: Record<string, string> = { bronze: 'text-amber-500', silver: 'text-gray-300', gold: 'text-yellow-400' };

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/users/${id}/detail`);
        if (data.success) setDetail(data.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load user detail.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>User not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  const { user, orders, disputes, workerLevel, wallet, recentRatings } = detail;
  const isWorker = user.role === 'worker';

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to users
      </button>

      {/* Header */}
      <div className="glass-card p-5 flex items-center gap-4 flex-wrap">
        <div className="w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-500/30 flex items-center justify-center overflow-hidden shrink-0">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-purple-300">{user.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
            {isWorker && (
              <span className={`text-xs font-semibold capitalize ${LEVEL_COLOR[user.level ?? 'bronze']}`}>
                {user.level ?? 'bronze'}
              </span>
            )}
            {isWorker && (
              <span className={user.isApproved ? 'text-green-400 text-xs' : 'text-yellow-400 text-xs'}>
                {user.isApproved ? '✓ Approved' : '⏳ Pending approval'}
              </span>
            )}
            {isWorker && user.isOnline && <span className="w-2 h-2 rounded-full bg-green-400" title="Online" />}
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-gray-400">
            <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
            {user.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {user.phone}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1">Joined {formatDate(user.createdAt)}</p>
        </div>
      </div>

      {/* Worker stats */}
      {isWorker && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Completed Orders" value={workerLevel?.completedOrders ?? 0} icon={ShoppingBag} color="purple" />
          <StatCard title="Success Rate" value={`${workerLevel?.successRate ?? 100}%`} icon={Star} color="green" />
          <StatCard title="Avg Rating" value={(workerLevel?.averageRating ?? 0).toFixed(1)} icon={Star} color="yellow" />
          <StatCard title="Wallet Balance" value={formatCurrency(wallet?.balance ?? 0)} sub={`Pending: ${formatCurrency(wallet?.pendingBalance ?? 0)}`} icon={Wallet} color="blue" />
        </div>
      )}

      {/* Recent ratings */}
      {isWorker && recentRatings?.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" /> Recent Ratings
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentRatings.map((r: any) => (
              <div key={r._id} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs flex items-center gap-1.5">
                <span className="text-yellow-400 font-semibold">{r.rating}★</span>
                <span className="text-gray-400">{r.customerId?.name ?? 'Customer'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">
            {isWorker ? 'Orders Accepted' : 'Orders Placed'} ({orders.length})
          </h2>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['ID', 'Service', isWorker ? 'Customer' : 'Worker', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {orders.map((o: any) => (
                  <tr key={o._id} className="hover:bg-white/[0.05] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-400 text-xs">{shortId(o._id)}</td>
                    <td className="px-4 py-2.5 text-white max-w-[140px] truncate">{o.serviceName}</td>
                    <td className="px-4 py-2.5 text-gray-400">
                      {isWorker ? (o.customerId?.name ?? '—') : (o.workerId?.name ?? '—')}
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">{formatCurrency(o.amount ?? o.workerEarning)}</td>
                    <td className="px-4 py-2.5"><OrderStatusBadge status={o.status as OrderStatus} /></td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disputes */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Disputes ({disputes.length})
          </h2>
        </div>
        {disputes.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">No disputes.</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {disputes.map((d: any) => (
              <div key={d._id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-white text-sm font-medium capitalize">{d.reason.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Order: {d.orderId?.serviceName ?? 'N/A'} · {formatDate(d.createdAt)}
                  </p>
                  {d.description && <p className="text-xs text-gray-400 mt-1">{d.description}</p>}
                </div>
                <span className={`text-xs font-semibold capitalize ${
                  d.status === 'open' ? 'text-yellow-400' : d.status === 'resolved' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
