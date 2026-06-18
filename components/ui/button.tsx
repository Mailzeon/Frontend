import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:     'bg-purple-600 text-white hover:bg-purple-500 shadow-glow-purple',
        secondary:   'bg-blue-600 text-white hover:bg-blue-500',
        destructive: 'bg-red-600 text-white hover:bg-red-500',
        outline:     'border border-[#374151] bg-transparent text-gray-300 hover:bg-[#374151] hover:text-white',
        ghost:       'text-gray-400 hover:bg-[#374151] hover:text-white',
        success:     'bg-green-600 text-white hover:bg-green-500',
        warning:     'bg-yellow-500 text-black hover:bg-yellow-400',
        link:        'text-purple-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-12 px-8 text-base',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={disabled || loading} {...props}>
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {children}
          </span>
        ) : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
export { Button, buttonVariants };
