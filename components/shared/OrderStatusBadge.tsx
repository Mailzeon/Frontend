import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASS, cn } from '@/lib/utils';
import { OrderStatus } from '@/types';

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn(ORDER_STATUS_CLASS[status], 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
