import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-[#374151]/60', className)} {...props} />;
}
export { Skeleton };
