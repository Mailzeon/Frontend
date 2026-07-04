'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams }        from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, RefreshCw, Star, XCircle } from 'lucide-react';
import { Button }           from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Skeleton }         from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label }            from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input }            from '@/components/ui/input';
import { toast }            from '@/components/ui/toast';
import { api }              from '@/lib/api';
import { shortId, formatDate, formatCurrency } from '@/lib/utils';
import { Order, DisputeReason } from '@/types';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import Link from 'next/link';

const DISPUTE_REASONS: { value: DisputeReason; label: string }[] = [
  { value: 'wrong_password',  label: 'Wrong password — cannot log in' },
  { value: 'unable_to_login', label: 'Unable to login for another reason' },
  { value: 'account_issue',   label: 'Account is suspended / deactivated' },
  { value: 'other',           label: 'Other issue' },
];

export default function CustomerOrderDetail() {
  const { id } = useParams<{ id: string }>();

  const [order,        setOrder]        = useState<Order | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [acting,       setActing]       = useState(false);
  const [showDispute,  setShowDispute]  = useState(false);
  const [showRating,   setShowRating]   = useState(false);
  const [showCancel,   setShowCancel]   = useState(false);
  const [rating,       setRating]       = useState(0);
  const [rated,        setRated]        = useState(false);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('wrong_password');
  const [disputeDesc,   setDisputeDesc]   = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get<{ success: boolean; data: Order }>(`/orders/${id}`);
      if (data.success) setOrder(data.data);
    } catch {
      toast.error('Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const socket = getSocket();
    if (!socket) return;

    const refresh = () => fetchOrder();
    socket.on(SOCKET_EVENTS.ORDER_ACCEPTED,    refresh);
    socket.on(SOCKET_EVENTS.CREDENTIALS_READY, refresh);
    socket.on(SOCKET_EVENTS.CODE_RECEIVED,     refresh);
    socket.on(SOCKET_EVENTS.ORDER_COMPLETED,   refresh);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_ACCEPTED,    refresh);
      socket.off(SOCKET_EVENTS.CREDENTIALS_READY, refresh);
      socket.off(SOCKET_EVENTS.CODE_RECEIVED,     refresh);
      socket.off(SOCKET_EVENTS.ORDER_COMPLETED,   refresh);
    };
  }, [fetchOrder]);

  const act = async (endpoint: string, successMsg: string) => {
    setActing(true);
    try {
      const { data } = await api.patch(`/orders/${id}/${endpoint}`);
      if (data.success) { toast.success(successMsg); fetchOrder(); }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Action failed.');
    } finally {
      setActing(false);
    }
  };

  // New: cancel a pending order (before any worker has accepted it)
  const cancelOrder = async () => {
    setCancelling(true);
    try {
      const { data } = await api.patch(`/orders/${id}/cancel`);
      if (data.success) {
        toast.success('Order cancelled.');
        setShowCancel(false);
        fetchOrder();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const submitDispute = async () => {
    setSubmittingDispute(true);
    try {
      const { data } = await api.patch(`/orders/${id}/dispute`, {
        reason:      disputeReason,
        description: disputeDesc.trim() || undefined,
      });
      if (data.success) {
        toast.success('Problem reported. Admin is reviewing your case.');
        setShowDispute(false);
        setDisputeDesc('');
        fetchOrder();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to report problem.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const submitRating = async () => {
    if (!rating) { toast.error('Please select a star rating.'); return; }
    try {
      await api.post('/ratings', { orderId: id, rating });
      toast.success('Thank you for your rating!');
      setShowRating(false);
      setRated(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Rating failed. You may have already rated this order.');
    }
  };

  if (loading) return (
    <div className="max-w-2xl space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
  if (!order) return <div className="text-gray-400 p-4">Order not found.</div>;

  const isPending   = order.status === 'pending';
  const isAccepted  = order.status === 'accepted';
  const isCreds     = order.status === 'credentials_submitted';
  const isVerif     = order.status === 'verification_pending';
  const isCompleted = order.status === 'completed';
  const isReview    = order.status === 'under_review';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customer/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{order.serviceName}</h1>
          <p className="text-xs text-gray-500">{shortId(order._id)} · {formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-auto">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Order info */}
      <div className="glass-card p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Amount Paid</p>
          <p className="font-bold text-white text-lg">{formatCurrency(order.amount)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Created</p>
          <p className="text-gray-300">{formatDate(order.createdAt)}</p>
        </div>
        {order.acceptedAt && (
          <div>
            <p className="text-gray-500 text-xs">Accepted</p>
            <p className="text-gray-300">{formatDate(order.acceptedAt)}</p>
          </div>
        )}
        {order.completedAt && (
          <div>
            <p className="text-gray-500 text-xs">Completed</p>
            <p className="text-green-400">{formatDate(order.completedAt)}</p>
          </div>
        )}
      </div>

      {/* Pending — with cancel option */}
      {isPending && (
        <div className="glass-card p-6 text-center space-y-4">
          <Clock className="w-10 h-10 text-yellow-400 mx-auto animate-pulse-soft" />
          <p className="font-semibold text-white">Waiting for a worker</p>
          <p className="text-sm text-gray-400">
            Your order is live in the marketplace. A worker will accept it shortly.
          </p>
          <Button variant="outline" onClick={() => setShowCancel(true)}>
            <XCircle className="w-4 h-4 mr-2" /> Cancel Order
          </Button>
        </div>
      )}

      {/* Accepted */}
      {isAccepted && (
        <div className="glass-card p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <p className="font-semibold text-white">Worker accepted your order</p>
          <p className="text-sm text-gray-400">
            Credentials will be submitted within 10 minutes.
          </p>
        </div>
      )}

      {/* Credentials submitted / Verification pending */}
      {(isCreds || isVerif) && (
        <div className="glass-card p-6 space-y-5">
          <p className="font-semibold text-white text-center">
            Credentials received. Were you able to log in?
          </p>

          {isVerif && order.verificationCode && (
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
              <p className="text-xs text-gray-500 mb-1">Verification Code</p>
              <p className="text-3xl font-bold text-green-400 tracking-widest font-mono">
                {order.verificationCode}
              </p>
            </div>
          )}

          {isVerif && !order.verificationCode && (
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
              <p className="text-sm text-blue-400 animate-pulse-soft">
                Waiting for worker to send code…
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="success"
              onClick={() => act('confirm', 'Order confirmed! Worker earnings released.')}
              loading={acting}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Logged In Successfully ✓
            </Button>

            {isCreds && (
              <Button
                variant="outline"
                onClick={() => act('request-code', 'Verification code requested!')}
                loading={acting}
              >
                Google / Platform is asking for a verification code
              </Button>
            )}

            {isVerif && order.verificationCode && (
              <Button
                variant="outline"
                onClick={() => act('request-new-code', 'New code requested!')}
                loading={acting}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Code expired — request a new code
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={() => setShowDispute(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report a Problem
            </Button>
          </div>
        </div>
      )}

      {/* Completed */}
      {isCompleted && (
        <div className="glass-card p-6 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <p className="font-bold text-white text-lg">Order Completed!</p>
          <p className="text-sm text-gray-400">Your order was completed successfully.</p>
          {!rated ? (
            <Button variant="outline" onClick={() => setShowRating(true)}>
              <Star className="w-4 h-4 mr-2" /> Rate this worker
            </Button>
          ) : (
            <p className="text-xs text-green-400">✓ You rated this order</p>
          )}
        </div>
      )}

      {/* Under Review */}
      {isReview && (
        <div className="glass-card p-6 text-center space-y-3 border border-red-500/20">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="font-semibold text-white">Under Review</p>
          <p className="text-sm text-gray-400">
            Admin is reviewing your dispute. You will be notified once resolved.
          </p>
        </div>
      )}

      {/* Cancelled */}
      {isCancelled && (
        <div className="glass-card p-6 text-center space-y-3">
          <XCircle className="w-10 h-10 text-gray-500 mx-auto" />
          <p className="font-semibold text-white">Order Cancelled</p>
          <p className="text-sm text-gray-400">This order was cancelled.</p>
        </div>
      )}

      {/* Cancel confirm modal */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Are you sure you want to cancel this order? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCancel(false)}>Keep Order</Button>
              <Button variant="destructive" loading={cancelling} onClick={cancelOrder}>
                Yes, Cancel Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute Modal */}
      <Dialog open={showDispute} onOpenChange={setShowDispute}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a Problem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Your order will be placed under admin review. Please select the reason below.
            </p>

            <div className="space-y-1.5">
              <Label>What is the problem?</Label>
              <Select
                value={disputeReason}
                onValueChange={v => setDisputeReason(v as DisputeReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Additional details <span className="text-gray-500">(optional)</span></Label>
              <Input
                placeholder="Describe what happened…"
                value={disputeDesc}
                onChange={e => setDisputeDesc(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDispute(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                loading={submittingDispute}
                onClick={submitDispute}
              >
                Submit Dispute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <Dialog open={showRating} onOpenChange={setShowRating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rate this Worker</DialogTitle></DialogHeader>
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-400">How was your experience with this worker?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRating(false)}>Skip</Button>
              <Button onClick={submitRating}>Submit Rating</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
