'use client';
import { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, History, PackagePlus, UserCheck, ShieldAlert, Ban,
  KeyRound, AlertTriangle, CheckCircle2, XCircle, IndianRupee, Clock3, Gavel,
  CreditCard,
} from 'lucide-react';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, formatDate, formatCurrency, cn } from '@/lib/utils';
import { OrderStatus } from '@/types';

const STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'credentials_submitted', label: 'Credentials Submitted' },
  { value: 'verification_pending', label: 'Verification Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'cancelled', label: 'Cancelled' },
];

// One entry per OrderHistoryEvent value on the backend — icon + color only;
// the actual wording always comes from the server's precomputed `message`.
const EVENT_STYLES: Record<string, { icon: any; color: string }> = {
  created:                             { icon: PackagePlus,  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  payment_confirmed:                   { icon: CreditCard,   color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  payment_failed:                      { icon: XCircle,      color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  accepted:                            { icon: UserCheck,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  accept_blocked_email_taken:          { icon: ShieldAlert,  color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  expired_returned:                    { icon: Clock3,       color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  theft_confirmed:                     { icon: Ban,          color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  credentials_submitted:               { icon: KeyRound,     color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  wrong_password_grace_granted:        { icon: AlertTriangle,color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  wrong_password_resubmitted:          { icon: KeyRound,     color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  completed:                           { icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  auto_completed:                      { icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  dispute_reported:                    { icon: AlertTriangle,color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  dispute_resolved_upheld:             { icon: Gavel,        color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  dispute_resolved_rejected:           { icon: Gavel,        color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  auto_cancelled_worker_unresponsive:  { icon: XCircle,      color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  cancelled:                           { icon: XCircle,      color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
  refunded:                            { icon: IndianRupee,  color: 'text-green-400 bg-green-500/10 border-green-500/20' },
};

const EVENT_LABELS: Record<string, string> = {
  created:                             'Order Created',
  payment_confirmed:                   'Payment Confirmed',
  payment_failed:                      'Payment Failed',
  accepted:                            'Accepted by Worker',
  accept_blocked_email_taken:          'Accept Blocked — Email Taken',
  expired_returned:                    'Timer Expired — Returned to Marketplace',
  theft_confirmed:                     'Confirmed Theft — Permanent Ban',
  credentials_submitted:               'Credentials Submitted',
  wrong_password_grace_granted:        'Wrong-Password Grace Window Granted',
  wrong_password_resubmitted:          'Credentials Resubmitted',
  completed:                           'Order Completed',
  auto_completed:                      'Auto-Completed',
  dispute_reported:                    'Dispute Reported',
  dispute_resolved_upheld:             'Dispute Resolved — Upheld',
  dispute_resolved_rejected:           'Dispute Resolved — Rejected',
  auto_cancelled_worker_unresponsive:  'Auto-Cancelled — Worker Unresponsive',
  cancelled:                           'Order Cancelled',
  refunded:                            'Refund Issued',
};

function HistoryModal({ orderId, open, onOpenChange }: { orderId: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get(`/admin/orders/${orderId}/history`);
        if (data.success) setEntries(data.data);
      } catch { toast.error('Failed to load order history.'); }
      finally { setLoading(false); }
    })();
  }, [open, orderId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" /> Order History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 mt-2">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No history recorded for this order yet.</p>
          </div>
        ) : (
          <div className="mt-2 relative">
            {/* Connecting line down the left side of the timeline */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/[0.08]" />
            <div className="space-y-5">
              {entries.map((e: any) => {
                const style = EVENT_STYLES[e.event] ?? { icon: History, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };
                const Icon = style.icon;
                return (
                  <div key={e._id} className="flex gap-3 relative">
                    <div className={cn('w-10 h-10 rounded-full border flex items-center justify-center shrink-0 z-10 bg-[#131318]', style.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">
                          {EVENT_LABELS[e.event] ?? e.event}
                        </p>
                        <span className="text-[11px] text-gray-500 shrink-0">{formatDate(e.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{e.message}</p>
                      {e.actorId?.name && (
                        <p className="text-[11px] text-gray-600 mt-1">
                          {e.actorRole === 'worker' ? '👷' : e.actorRole === 'customer' ? '🧑' : e.actorRole === 'admin' ? '🛡️' : '🤖'}{' '}
                          {e.actorId.name}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus]   = useState('all');
  const [search, setSearch]   = useState('');
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async (s: string, p: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (s !== 'all') params.set('status', s);
      const { data } = await api.get(`/admin/orders?${params.toString()}`);
      if (data.success) {
        setOrders(prev => append ? [...prev, ...data.data.orders] : data.data.orders);
        setTotalPages(data.data.totalPages);
        setTotalCount(data.data.total);
        setPage(p);
      }
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { fetchOrders(status, 1, false); }, [status]);

  const filtered = orders.filter(o =>
    o.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
    o._id.includes(search)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">All Orders</h1>
        <p className="text-gray-400 text-sm mt-0.5">{totalCount} orders</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search by service or ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(5).fill(0).map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[840px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['ID','Service','Customer','Worker','Amount','Status','Date',''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map(o => (
                <tr key={o._id} className="hover:bg-white/[0.05] transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{shortId(o._id)}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[150px] truncate">{o.serviceName}</td>
                  <td className="px-4 py-3 text-gray-400">{o.customerId?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{o.workerId?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{formatCurrency(o.amount)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status as OrderStatus} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => setHistoryOrderId(o._id)}
                    >
                      <History className="w-3.5 h-3.5" /> History
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {!loading && page < totalPages && (
          <div className="p-4 border-t border-white/[0.06] flex justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => fetchOrders(status, page + 1, true)}
            >
              {loadingMore ? 'Loading...' : `Load More (${orders.length} of ${totalCount})`}
            </Button>
          </div>
        )}
      </div>

      <HistoryModal
        orderId={historyOrderId}
        open={historyOrderId !== null}
        onOpenChange={(v) => { if (!v) setHistoryOrderId(null); }}
      />
    </div>
  );
}
