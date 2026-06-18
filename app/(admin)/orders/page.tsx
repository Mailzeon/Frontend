'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, formatDate, formatCurrency } from '@/lib/utils';
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

export default function AdminOrdersPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState('all');
  const [search, setSearch]   = useState('');

  const fetchOrders = async (s: string) => {
    setLoading(true);
    try {
      const q = s !== 'all' ? `?status=${s}` : '';
      const { data } = await api.get(`/admin/orders${q}`);
      if (data.success) setOrders(data.data.orders);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(status); }, [status]);

  const filtered = orders.filter(o =>
    o.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
    o._id.includes(search)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">All Orders</h1>
        <p className="text-gray-400 text-sm mt-0.5">{orders.length} orders</p>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151]">
                {['ID','Service','Customer','Worker','Amount','Status','Date'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]/50">
              {filtered.map(o => (
                <tr key={o._id} className="hover:bg-[#374151]/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{shortId(o._id)}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[150px] truncate">{o.serviceName}</td>
                  <td className="px-4 py-3 text-gray-400">{o.customerId?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{o.workerId?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{formatCurrency(o.amount)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status as OrderStatus} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
