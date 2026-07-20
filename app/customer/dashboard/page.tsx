'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, Clock, AlertTriangle, Plus, Shuffle, Edit3, Check, IndianRupee, Phone } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
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

export default function CustomerDashboard() {
  const { user, updateUser } = useAuthStore();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [service, setService]     = useState('');
  const [domain, setDomain]       = useState('');
  const [emailType, setEmailType] = useState<'random' | 'custom'>('random');
  const [customLocal, setCustomLocal] = useState('');
  // NEW: customer sets their own order amount now (was a fixed admin price before)
  const [amount, setAmount]       = useState('');
  // NEW: only asked for if not already saved on the customer's profile
  const [phone, setPhone]         = useState('');

  const fetch = async () => {
    try {
      const { data } = await api.get('/orders/my');
      if (data.success) setOrders(data.data);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const stats = {
    total:     orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    active:    orders.filter(o => !['completed','cancelled','payment_failed'].includes(o.status)).length,
    disputes:  orders.filter(o => o.status === 'under_review').length,
  };

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
        // Order is created but NOT yet in the marketplace — it only becomes
        // visible to workers once Cashfree confirms the payment succeeded.
        await openCashfreeCheckout(data.data.paymentSessionId);
        // openCashfreeCheckout navigates the browser away to Cashfree's
        // hosted page — code after this line does not run until the
        // customer is redirected back (handled on the order detail page).
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
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track your orders and activity</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders"    value={stats.total}     icon={ShoppingBag}     color="purple" />
        <StatCard title="Completed"       value={stats.completed} icon={CheckCircle}     color="green" />
        <StatCard title="Active"          value={stats.active}    icon={Clock}           color="blue" />
        <StatCard title="Under Review"    value={stats.disputes}  icon={AlertTriangle}   color="red" />
      </div>

      {/* Recent orders */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Orders</h2>
          <Link href="/customer/orders" className="text-xs text-purple-400 hover:text-purple-300">View all</Link>
        </div>

        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders yet. Place your first order!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0,5).map(o => (
              <Link key={o._id} href={`/customer/orders/${o._id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#374151]/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{o.serviceName}</p>
                  <p className="text-xs text-gray-500">{shortId(o._id)} · {timeAgo(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {o.amount !== undefined && (
                    <span className="text-sm font-medium text-gray-300">{formatCurrency(o.amount)}</span>
                  )}
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create order modal */}
      <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) resetModal(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Place New Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={createOrder} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service name / description</Label>
              <Input placeholder="e.g. Instagram login verification" value={service} onChange={e => setService(e.target.value)} autoFocus />
            </div>

            {/* NEW: customer sets their own order amount */}
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

            {/* NEW: phone — only asked once, then saved to profile */}
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
