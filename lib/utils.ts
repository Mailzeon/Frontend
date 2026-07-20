import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderStatus } from '@/types';

/** Merge Tailwind classes without conflicts. Used by all components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a Date or ISO string into a readable format. */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

/** Return how long ago a date was (e.g. "3 minutes ago"). */
export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60)    return `${seconds}s ago`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Shorten a MongoDB ObjectId to the last 6 characters for display. */
export function shortId(id: string): string {
  return '#' + id.slice(-6).toUpperCase();
}

/** Human-readable labels for each order status. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  payment_pending:        'Awaiting Payment',   // NEW
  payment_failed:         'Payment Failed',     // NEW
  pending:                'Pending',
  accepted:               'Accepted',
  credentials_submitted:  'Credentials Submitted',
  verification_pending:   'Verification Pending',
  success_confirmed:      'Success Confirmed',
  completed:              'Completed',
  under_review:           'Under Review',
  cancelled:              'Cancelled',
};

/** CSS class name for each order status badge. */
export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  payment_pending:       'badge-pending',    // NEW — reuses existing yellow/pulsing style
  payment_failed:        'badge-cancelled',  // NEW — reuses existing gray "terminal" style
  pending:               'badge-pending',
  accepted:              'badge-accepted',
  credentials_submitted: 'badge-credentials',
  verification_pending:  'badge-verification',
  success_confirmed:     'badge-confirmed',
  completed:             'badge-completed',
  under_review:          'badge-review',
  cancelled:             'badge-cancelled',
};

/** Format seconds into MM:SS countdown display. */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
