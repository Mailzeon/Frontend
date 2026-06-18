import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
        secondary:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
        destructive: 'bg-red-500/10 text-red-400 border-red-500/20',
        success:     'bg-green-500/10 text-green-400 border-green-500/20',
        warning:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        outline:     'border-[#374151] text-gray-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
