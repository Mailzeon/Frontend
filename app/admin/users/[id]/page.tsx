'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Wallet, Star, ShoppingBag, AlertTriangle, Phone, Mail, Trash2, ShieldAlert,
  Globe, Smartphone, Copy,
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, shortId } from '@/lib/utils';
import { OrderStatus } from '@/types';

const LEVEL_COLOR: Record<string, string> = { bronze: 'text-amber-500', silver: 'text-gray-300', gold: 'text-yellow-400' };

// Mirrors backend utils/permanentLock.ts's PERMANENT_LOCK_DATE convention
// (year 9999) — any lockedUntil more than ~50 years out is a permanent
// ban, not a real countdown, so show it as such instead of a giant
// nonsensical date/duration.
const isPermanentLockDate = (date: string | Date) =>
  new Date(date).getFullYear() > new Date().getFullYear() + 50;

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied!`);
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showClearData, setShowClearData]   = useState(false);
  const [clearConfirm, setClearConfirm]     = useState('');
  const [clearingData, setClearingData]     = useState(false);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm]         = useState('');
  const [deletingAccount, setDeletingAccount]     = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${id}/detail`);
      if (data.success) setDetail(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load user detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const clearUserData = async () => {
    if (clearConfirm !== 'CLEAR') { toast.error('Type CLEAR exactly to confirm.'); return; }
    setClearingData(true);
    try {
      const { data } = await api.post(`/admin/users/${id}/clear-data`, { confirm: 'CLEAR' });
      if (data.success) {
        toast.success("This user's data has been cleared.");
        setShowClearData(false);
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear data.');
    } finally {
      setClearingData(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE exactly to confirm.'); return; }
    setDeletingAccount(true);
    try {
      const { data } = await api.delete(`/admin/users/${id}`);
      if (data.success) {
        toast.success('Account deleted.');
        setShowDeleteAccount(false);
        router.push('/admin/users');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const [unlocking, setUnlocking] = useState(false);
  const unlockWorker = async () => {
    setUnlocking(true);
    try {
      const { data } = await api.post(`/admin/users/${id}/unlock`, {});
      if (data.success) { toast.success('Lock lifted.'); fetchDetail(); }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to lift lock.');
    } finally {
      setUnlocking(false);
    }
  };

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
            {user.isDeleted && (
              <span className="text-xs font-semibold text-red-400 flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                <ShieldAlert className="w-3 h-3" /> Account Deleted
              </span>
            )}
            {isWorker && (
              <span className={`text-xs font-semibold capitalize ${LEVEL_COLOR[user.level ?? 'bronze']}`}>
                {user.level ?? 'bronze'}
              </span>
            )}
            {isWorker && (
              <span className={
                user.isApproved ? 'text-green-400 text-xs'
                : user.wasEverApproved ? 'text-red-400 text-xs'
                : 'text-yellow-400 text-xs'
              }>
                {user.isApproved
                  ? '✓ Approved'
                  : user.wasEverApproved
                    ? '⛔ Suspended'
                    : user.lockedUntil && new Date(user.lockedUntil) > new Date() && !isPermanentLockDate(user.lockedUntil)
                      ? '⏳ Held (auto-approves when lock ends)'
                      : '⏳ Pending approval'}
              </span>
            )}
            {isWorker && user.isOnline && <span className="w-2 h-2 rounded-full bg-green-400" title="Online" />}
          </div>
          {isWorker && (user.strikeCount > 0 || (user.lockedUntil && new Date(user.lockedUntil) > new Date())) && (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {user.strikeCount > 0 && (
                <span className="text-xs font-medium text-amber-400 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  <ShieldAlert className="w-3 h-3" /> {user.strikeCount} strike{user.strikeCount > 1 ? 's' : ''}
                </span>
              )}
              {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                <span className="text-xs font-medium text-red-400 flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                  {isPermanentLockDate(user.lockedUntil) ? '⛔ Permanently Banned' : `🔒 Locked until ${formatDate(user.lockedUntil)}`}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user.email}
              {user.emailVerificationStatus === 'valid' && (
                <span className="text-[10px] font-semibold text-green-400 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">✓</span>
              )}
              {user.emailVerificationStatus === 'invalid' && (
                <span className="text-[10px] font-semibold text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20" title="Confirmed not to exist">⛔</span>
              )}
              {(!user.emailVerificationStatus || user.emailVerificationStatus === 'unknown') && (
                <span className="text-[10px] font-semibold text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20" title="Not confirmed to exist">⚠️</span>
              )}
            </span>
            {user.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {user.phone}
                {user.phoneVerified && (
                  <span className="text-[10px] font-semibold text-green-400 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">✓</span>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Joined {formatDate(user.createdAt)}</p>
        </div>
      </div>

      {/* Network & device info — see backend User.model.ts registrationIp/
          lastLoginIp/registrationDevice/lastLoginDevice, and
          ipRiskFlag from the VPN/proxy check at signup. Useful for
          spotting shared IPs/devices across accounts (evasion) or just
          confirming a support/dispute claim. */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" /> Network & Device
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-xs text-gray-500 mb-1">Registration IP</p>
            {user.registrationIp ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-gray-300">{user.registrationIp}</span>
                <button onClick={() => copyText(user.registrationIp, 'IP')} className="text-gray-500 hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ) : <span className="text-gray-600">—</span>}
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-xs text-gray-500 mb-1">Last Login IP</p>
            {user.lastLoginIp ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-gray-300">{user.lastLoginIp}</span>
                <button onClick={() => copyText(user.lastLoginIp, 'IP')} className="text-gray-500 hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
                {user.lastLoginIp !== user.registrationIp && (
                  <span className="text-[10px] text-gray-500">(different from registration)</span>
                )}
              </div>
            ) : <span className="text-gray-600">—</span>}
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Registration Device</p>
            <p className="text-gray-300">{user.registrationDeviceLabel || 'Unknown device'}</p>
            {user.registrationDevice && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-mono text-gray-500 text-[10px] truncate max-w-[160px]" title={user.registrationDevice}>
                  ID: {user.registrationDevice}
                </span>
                <button onClick={() => copyText(user.registrationDevice, 'Device ID')} className="text-gray-500 hover:text-white shrink-0">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Last Login Device</p>
            <p className="text-gray-300">
              {user.lastLoginDeviceLabel || 'Unknown device'}
              {user.lastLoginDeviceLabel && user.lastLoginDeviceLabel !== user.registrationDeviceLabel && (
                <span className="text-[10px] text-gray-500 ml-1.5">(different from registration)</span>
              )}
            </p>
            {user.lastLoginDevice && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-mono text-gray-500 text-[10px] truncate max-w-[160px]" title={user.lastLoginDevice}>
                  ID: {user.lastLoginDevice}
                </span>
                <button onClick={() => copyText(user.lastLoginDevice, 'Device ID')} className="text-gray-500 hover:text-white shrink-0">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        {user.ipRiskFlag?.isRisky && (
          <div className="mt-3 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Signed up via {user.ipRiskFlag.reasons?.join(', ') || 'VPN/Proxy'} — not necessarily a problem, just worth a look.
          </div>
        )}
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

      {/* Danger zone — admin-only destructive actions on this specific user */}
      {!user.isDeleted && (
        <div className="glass-card p-5 border border-red-500/20 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-white">Danger Zone</h2>
          </div>

          {isWorker && user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
            <div className="flex items-start justify-between gap-4 flex-wrap p-3 rounded-xl bg-white/[0.03]">
              <div>
                <p className="text-sm font-medium text-white">Lift Dispute-Strike Lock Early</p>
                <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                  Currently locked until {formatDate(user.lockedUntil)}. This ends the lock immediately —
                  their strike count stays on record, only the current lockout is lifted.
                </p>
              </div>
              <Button variant="outline" className="shrink-0" loading={unlocking} onClick={unlockWorker}>
                Lift Lock Now
              </Button>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 flex-wrap p-3 rounded-xl bg-white/[0.03]">
            <div>
              <p className="text-sm font-medium text-white">Clear This User's Data</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                Wipes every order, dispute, transaction, notification, and rating this user is part of,
                and resets their wallet/level stats. The ACCOUNT itself stays — they can still log in
                with a clean slate. Note: this also removes these records from the other party's
                history in any shared order/dispute.
              </p>
            </div>
            <Button variant="outline" className="shrink-0" onClick={() => { setClearConfirm(''); setShowClearData(true); }}>
              Clear Data
            </Button>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap p-3 rounded-xl bg-white/[0.03]">
            <div>
              <p className="text-sm font-medium text-white">Delete This Account</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                Removes their name/email and blocks them from logging in — they'll no longer count
                toward total {isWorker ? 'workers' : 'customers'}. Their existing orders, transactions,
                and ratings stay exactly as they are. Blocked if they have an order still in progress.
              </p>
            </div>
            <Button variant="destructive" className="shrink-0" onClick={() => { setDeleteConfirm(''); setShowDeleteAccount(true); }}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </div>
      )}

      {/* Clear Data confirmation */}
      <Dialog open={showClearData} onOpenChange={setShowClearData}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clear {user.name}'s Data?</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
              This cannot be undone. Every order, dispute, transaction, notification, and rating tied
              to this user will be permanently deleted — including this user's side of any shared
              order/dispute, which also removes it from the other party's history.
            </div>
            <div className="space-y-1.5">
              <Label>Type <span className="font-mono text-white">CLEAR</span> to confirm</Label>
              <Input value={clearConfirm} onChange={e => setClearConfirm(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowClearData(false)}>Cancel</Button>
              <Button variant="destructive" loading={clearingData} onClick={clearUserData}>
                Clear Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account confirmation */}
      <Dialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {user.name}'s Account?</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
              This cannot be undone. They'll immediately lose access. Blocked automatically if they
              have any order still in progress.
            </div>
            <div className="space-y-1.5">
              <Label>Type <span className="font-mono text-white">DELETE</span> to confirm</Label>
              <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteAccount(false)}>Cancel</Button>
              <Button variant="destructive" loading={deletingAccount} onClick={deleteAccount}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
