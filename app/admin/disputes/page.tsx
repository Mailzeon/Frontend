'use client';
import { formatCurrency, formatDate, shortId, cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  AlertTriangle, UserX, CheckCircle2, Star, Mail, Phone, Calendar,
  Package, ShieldAlert, KeyRound, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('Copied!');
}

// Quick one-line reasons — picking one just fills the Admin Note field, so
// the admin can still edit it further before submitting. Saves having to
// type the same handful of explanations out by hand every time.
const CUSTOMER_SIDE_REASONS = [
  'Worker never submitted working credentials.',
  "Password/login didn't work as the worker claimed.",
  'Worker appears to be at fault based on the evidence provided.',
];
const WORKER_SIDE_REASONS = [
  'Credentials worked fine — likely a customer-side error.',
  "No evidence supporting the customer's claim.",
  'Customer appears to have entered the password incorrectly.',
];

const REASON_LABELS: Record<string, string> = {
  wrong_password: 'Wrong Password', unable_to_login: 'Unable to Login',
  account_issue: 'Account Issue', other: 'Other',
};
const STATUS_COLOR: Record<string, string> = {
  open: 'text-red-400', resolved: 'text-green-400', rejected: 'text-gray-400',
};
// Clearer, human labels for the final outcome shown in the closed list —
// 'resolved' means the customer's claim was upheld (order cancelled),
// 'rejected' means the claim was denied (order completed, worker paid).
const OUTCOME_LABELS: Record<string, string> = {
  resolved: 'Sided with Customer — Order Cancelled',
  rejected: 'Sided with Worker — Order Completed',
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail]     = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote]         = useState('');
  // Was a single shared boolean before — both "Side with Customer" and
  // "Side with Worker" buttons showed a spinner no matter which one was
  // actually clicked. Now tracks WHICH outcome is in flight, so only that
  // button animates.
  const [acting, setActing]     = useState<'resolved' | 'rejected' | null>(null);

  const fetchDisputes = async () => {
    try {
      const { data } = await api.get('/admin/disputes');
      if (data.success) setDisputes(data.data);
    } catch { toast.error('Failed to load disputes.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDisputes(); }, []);

  const openReview = async (d: any) => {
    setSelected(d); setNote(''); setDetail(null); setDetailLoading(true);
    try {
      const { data } = await api.get(`/admin/disputes/${d._id}/detail`);
      if (data.success) setDetail(data.data);
    } catch { toast.error('Failed to load dispute details.'); }
    finally { setDetailLoading(false); }
  };

  const resolve = async (status: 'resolved' | 'rejected') => {
    if (!selected) return;
    setActing(status);
    try {
      const { data } = await api.patch(`/admin/disputes/${selected._id}`, { status, adminNote: note });
      if (data.success) {
        toast.success(
          status === 'resolved'
            ? 'Dispute resolved — order cancelled, worker not paid.'
            : 'Dispute rejected — order completed, worker paid.'
        );
        setDisputes(p => p.map(d => d._id === selected._id ? { ...d, status } : d));
        setSelected(null); setDetail(null); setNote('');
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(null); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Disputes</h1>
        <p className="text-gray-400 text-sm mt-0.5">{disputes.filter(d => d.status === 'open').length} open · {disputes.length} total</p>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No disputes. Great!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {disputes.map(d => (
              <div key={d._id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${STATUS_COLOR[d.status]}`}>
                      {d.status === 'open' ? 'Open' : OUTCOME_LABELS[d.status]}
                    </span>
                    <span className="text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{shortId(d.orderId?._id ?? d.orderId)}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{REASON_LABELS[d.reason] ?? d.reason}</p>
                  <p className="text-xs text-gray-500">
                    Customer: {d.customerId?.name} · Worker: {d.workerId?.name} · {formatDate(d.createdAt)}
                  </p>
                  {d.description && <p className="text-xs text-gray-400 italic">"{d.description}"</p>}
                  {d.adminNote && <p className="text-xs text-blue-400">Admin note: {d.adminNote}</p>}
                </div>
                {d.status === 'open' && (
                  <Button size="sm" onClick={() => openReview(d)}>
                    Review
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review modal — full order/customer/worker context so admin never
          needs to open the database to make a call. */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setDetail(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review Dispute</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.05] text-sm space-y-1">
                <p className="text-white font-medium">{REASON_LABELS[selected.reason]}</p>
                {selected.description && <p className="text-gray-400 italic">"{selected.description}"</p>}
                <p className="text-gray-500 text-xs">Raised {formatDate(selected.createdAt)}</p>
              </div>

              {detailLoading ? (
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : detail && (
                <>
                  {/* Order details */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Order Details
                      </span>
                      <OrderStatusBadge status={detail.order?.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div><span className="text-gray-500">Order ID</span><p className="text-gray-300">{shortId(detail.order?._id)}</p></div>
                      <div><span className="text-gray-500">Service</span><p className="text-gray-300">{detail.order?.serviceName}</p></div>
                      <div><span className="text-gray-500">Amount Paid</span><p className="text-gray-300">{formatCurrency(detail.order?.amount)}</p></div>
                      <div><span className="text-gray-500">Worker Earning</span><p className="text-gray-300">{formatCurrency(detail.order?.workerEarning)}</p></div>
                      <div><span className="text-gray-500">Created</span><p className="text-gray-300">{formatDate(detail.order?.createdAt)}</p></div>
                      <div><span className="text-gray-500">Credentials Submitted</span><p className="text-gray-300">{detail.order?.credentialsSubmittedAt ? formatDate(detail.order.credentialsSubmittedAt) : '—'}</p></div>
                    </div>
                    {detail.order?.requestedEmail ? (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.05]">
                        <span className="text-gray-500">Requested Email</span>
                        <button onClick={() => copyText(detail.order.requestedEmail)} className="text-gray-300 flex items-center gap-1 hover:text-white">
                          {detail.order.requestedEmail} <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.05]">
                        <span className="text-gray-500">Email Type</span>
                        <span className="text-gray-300">Random — any @{detail.order?.domain} account</span>
                      </div>
                    )}
                    {detail.order?.credentials?.email && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1"><KeyRound className="w-3 h-3" /> Account Email</span>
                        <button onClick={() => copyText(detail.order.credentials.email)} className="text-gray-300 flex items-center gap-1 hover:text-white">
                          {detail.order.credentials.email} <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {detail.order?.credentials?.password && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1"><KeyRound className="w-3 h-3" /> Account Password</span>
                        <button onClick={() => copyText(detail.order.credentials.password)} className="text-gray-300 flex items-center gap-1 hover:text-white">
                          {detail.order.credentials.password} <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {detail.order?.verificationCode && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          {detail.order?.verificationMethod === 'code' ? 'Verification Code Sent' : 'Verification Number Submitted'}
                        </span>
                        <span className="text-gray-300">{detail.order.verificationCode}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer + Worker side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                      <p className="text-xs font-semibold text-gray-300">Customer</p>
                      <p className="text-sm text-white">{detail.customer?.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {detail.customer?.email}</p>
                      {detail.customer?.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {detail.customer.phone}</p>}
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {formatDate(detail.customer?.createdAt)}</p>
                      <div className="pt-1.5 mt-1.5 border-t border-white/[0.05] text-xs text-gray-400 space-y-0.5">
                        <p>Total orders: <span className="text-gray-200">{detail.customer?.totalOrders}</span></p>
                        <p className={cn(detail.customer?.totalDisputesRaised >= 3 && 'text-amber-400')}>
                          Disputes raised: <span className="text-gray-200">{detail.customer?.totalDisputesRaised}</span>
                          {detail.customer?.totalDisputesRaised >= 3 && (
                            <span className="ml-1 inline-flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" /> frequent</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                      <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        Worker
                        {detail.worker?.level && <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px]">{detail.worker.level}</span>}
                      </p>
                      <p className="text-sm text-white">{detail.worker?.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {detail.worker?.email}</p>
                      {detail.worker?.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {detail.worker.phone}</p>}
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {formatDate(detail.worker?.createdAt)}</p>
                      <div className="pt-1.5 mt-1.5 border-t border-white/[0.05] text-xs text-gray-400 space-y-0.5">
                        <p>Completed orders: <span className="text-gray-200">{detail.worker?.completedOrders}</span></p>
                        <p className="flex items-center gap-1">Rating: <span className="text-gray-200 flex items-center gap-0.5">{detail.worker?.averageRating?.toFixed?.(1) ?? '—'} <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /></span></p>
                        <p className={cn(detail.worker?.totalDisputesAgainst >= 3 && 'text-amber-400')}>
                          Disputes against: <span className="text-gray-200">{detail.worker?.totalDisputesAgainst}</span> ({detail.worker?.disputesUpheldAgainst} upheld)
                          {detail.worker?.totalDisputesAgainst >= 3 && (
                            <span className="ml-1 inline-flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" /> repeat</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400">
                Choose an outcome below. This immediately closes the order — there is no further
                action needed afterward.
              </div>

              <div className="space-y-1.5">
                <Label>Quick reason (optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select onValueChange={(v) => setNote(v)}>
                    <SelectTrigger><SelectValue placeholder="Reason to side with customer..." /></SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_SIDE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => setNote(v)}>
                    <SelectTrigger><SelectValue placeholder="Reason to side with worker..." /></SelectTrigger>
                    <SelectContent>
                      {WORKER_SIDE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Admin Note (optional)</Label>
                <Input placeholder="Explanation for your decision..." value={note} onChange={e => setNote(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="destructive"
                  loading={acting === 'resolved'}
                  disabled={acting === 'rejected'}
                  onClick={() => resolve('resolved')}
                  className="justify-start"
                >
                  <UserX className="w-4 h-4 mr-2 shrink-0" />
                  Side with Customer — Cancel Order (worker not paid)
                </Button>
                <Button
                  variant="success"
                  loading={acting === 'rejected'}
                  disabled={acting === 'resolved'}
                  onClick={() => resolve('rejected')}
                  className="justify-start"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                  Side with Worker — Complete Order (worker paid)
                </Button>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" disabled={!!acting} onClick={() => { setSelected(null); setDetail(null); }}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
