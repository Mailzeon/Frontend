'use client';
import { formatDate, shortId, cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { AlertTriangle, UserX, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

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
  const [note, setNote]         = useState('');
  const [acting, setActing]     = useState(false);

  const fetchDisputes = async () => {
    try {
      const { data } = await api.get('/admin/disputes');
      if (data.success) setDisputes(data.data);
    } catch { toast.error('Failed to load disputes.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDisputes(); }, []);

  const resolve = async (status: 'resolved' | 'rejected') => {
    if (!selected) return;
    setActing(true);
    try {
      const { data } = await api.patch(`/admin/disputes/${selected._id}`, { status, adminNote: note });
      if (data.success) {
        toast.success(
          status === 'resolved'
            ? 'Dispute resolved — order cancelled, worker not paid.'
            : 'Dispute rejected — order completed, worker paid.'
        );
        setDisputes(p => p.map(d => d._id === selected._id ? { ...d, status } : d));
        setSelected(null); setNote('');
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(false); }
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
          <div className="divide-y divide-[#374151]/50">
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
                  <Button size="sm" onClick={() => { setSelected(d); setNote(''); }}>
                    Review
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review modal — buttons now clearly state the real consequence */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Dispute</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#374151]/40 text-sm space-y-1">
                <p className="text-white font-medium">{REASON_LABELS[selected.reason]}</p>
                <p className="text-gray-400">Order: {shortId(selected.orderId?._id ?? selected.orderId)}</p>
                {selected.description && <p className="text-gray-400 italic">"{selected.description}"</p>}
              </div>

              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400">
                Choose an outcome below. This immediately closes the order — there is no further
                action needed afterward.
              </div>

              <div className="space-y-1.5">
                <Label>Admin Note (optional)</Label>
                <Input placeholder="Explanation for your decision..." value={note} onChange={e => setNote(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="destructive"
                  loading={acting}
                  onClick={() => resolve('resolved')}
                  className="justify-start"
                >
                  <UserX className="w-4 h-4 mr-2 shrink-0" />
                  Side with Customer — Cancel Order (worker not paid)
                </Button>
                <Button
                  variant="success"
                  loading={acting}
                  onClick={() => resolve('rejected')}
                  className="justify-start"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                  Side with Worker — Complete Order (worker paid)
                </Button>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
