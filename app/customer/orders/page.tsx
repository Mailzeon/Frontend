'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Shuffle, Edit3, Check, IndianRupee, Phone } from 'lucide-react';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { shortId, timeAgo, formatCurrency, cn } from '@/lib/utils';
import { EMAIL_DOMAINS } from '@/lib/emailDomains';
import { openCashfreeCheckout } from '@/lib/cashfree';
import { useAuthStore } from '@/store/authStore';
import { Order } from '@/types';
import Link from 'next/link';

export default function CustomerOrdersPage() {
  const { user, updateUser } = useAuthStore();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [service, setService]     = useState('');
  const [domain, setDomain]       = useState('');
  const [emailType, setEmailType] = useState<'random' | 'custom'>('random');
  const [customLocal, setCustomLocal] = useState('');
  const [amount, setAmount]       = useState('');
  const [phone, setPhone]         = useState('');

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/my');
      if (data.success) setOrders(data.data);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const resetModal = () => {
    setService(''); setDomain(''); setEmailType('random'); setCustomLocal('');
    setAmount(''); setPhone('');
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service.trim()) { toast.error('Enter a service name.'); return; }
    if (!domain) { toast.error('Select an email domain.'); return; }
    if (emailType === 'custom' && !customLocal.trim()) { toast.error('Enter your custom email name.'); return; }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < 15) { toast.error('Minimum order amount is ₹15.'); return; }
    if (!user?.phone && !/^[6-9]\d{9}$/.test(phone)) { toast.error('Enter a valid 10-digit phone number.'); return; }

    setCreating(true);
    try {
      const { data } = await api.post('/orders', {
        serviceName: service,
        domain,
        emailType,
        customLocalPart: emailType === 'custom' ? customLocal.trim() : undefined,
        amount: numAmount,
        ...(user?.phone ? {} : { phone }),
      });

      if (data.success) {
        if (!user?.phone && phone) updateUser({ phone });
        toast.success('Redirecting to payment…');
        await openCashfreeCheckout(data.data.paymentSessionId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order.');
      setCreating(false);
    }
  };

  const previewEmail = domain && emailType === 'custom' && customLocal.trim()
    ? `${customLocal.trim().toLowerCase()}@${domain}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-gray-400">No orders yet</p>
            <p className="text-sm mt-1">Place your first order to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151]">
                {['Order ID','Service','Amount','Status','Date',''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]/50">
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-[#374151]/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{shortId(o._id)}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{o.serviceName}</td>
                  <td className="px-4 py-3 text-gray-300">{o.amount !== undefined ? formatCurrency(o.amount) : '—'}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{timeAgo(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/customer/orders/${o._id}`}
                      className="text-xs text-purple-400 hover:text-purple-300">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) resetModal(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Place New Order</DialogTitle></DialogHeader>
          <form onSubmit={createOrder} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service description</Label>
              <Input placeholder="e.g. Instagram login verification" value={service}
                onChange={e => setService(e.target.value)} autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Order amount
              </Label>
              <Input
                type="number"
                min="15"
                placeholder="Minimum ₹15"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                85% goes to the worker who completes your order, 15% is the platform fee.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Email domain</Label>
              <div className="grid grid-cols-3 gap-2">
                {EMAIL_DOMAINS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDomain(d)}
                    className={cn(
                      'relative flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all truncate',
                      domain === d
                        ? 'border-purple-500 bg-purple-600/10 text-white'
                        : 'border-[#374151] text-gray-400 hover:border-[#4B5563] hover:text-gray-200'
                    )}
                  >
                    {domain === d && <Check className="w-3 h-3 text-purple-400 shrink-0" />}
                    <span className="truncate">@{d}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email type</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEmailType('random')}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                    emailType === 'random' ? 'border-purple-500 bg-purple-600/10 text-white' : 'border-[#374151] text-gray-400 hover:border-[#4B5563]'
                  )}>
                  <Shuffle className={cn('w-5 h-5', emailType === 'random' ? 'text-purple-400' : 'text-gray-500')} />
                  <span className="font-medium text-sm">Random</span>
                  <span className="text-xs text-gray-500 text-center">Auto-generated</span>
                </button>
                <button type="button" onClick={() => setEmailType('custom')}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                    emailType === 'custom' ? 'border-purple-500 bg-purple-600/10 text-white' : 'border-[#374151] text-gray-400 hover:border-[#4B5563]'
                  )}>
                  <Edit3 className={cn('w-5 h-5', emailType === 'custom' ? 'text-purple-400' : 'text-gray-500')} />
                  <span className="font-medium text-sm">Custom</span>
                  <span className="text-xs text-gray-500 text-center">You choose the name</span>
                </button>
              </div>
            </div>

            {emailType === 'custom' && (
              <div className="space-y-1.5">
                <Label>Custom email name</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="yourtext" value={customLocal} onChange={e => setCustomLocal(e.target.value)} className="flex-1" />
                  <span className="text-gray-500 text-sm whitespace-nowrap">@{domain || '...'}</span>
                </div>
              </div>
            )}

            {previewEmail && (
              <div className="p-3 rounded-xl bg-[#374151]/40 text-sm">
                <span className="text-gray-500">Email to be created: </span>
                <span className="text-white font-mono break-all">{previewEmail}</span>
              </div>
            )}
            {emailType === 'random' && domain && (
              <p className="text-xs text-gray-500">A random email address will be generated automatically on @{domain}.</p>
            )}

            {!user?.phone && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone number
                </Label>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
                <p className="text-xs text-gray-500">Required by our payment partner. Saved to your profile for next time.</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={creating}>
                {amount ? `Pay ${formatCurrency(Number(amount) || 0)} & Place Order` : 'Continue to Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
