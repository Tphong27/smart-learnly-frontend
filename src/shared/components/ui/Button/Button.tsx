import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-[#825ef5] text-white hover:bg-[#7c52e8] focus-visible:ring-[#825ef5] shadow-[2px_2px_0px_#2e2e2e] hover:shadow-[3px_3px_0px_#2e2e2e] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2e2e2e] rounded-[16px] border-2 border-black px-6 py-3',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 shadow-[2px_2px_0px_#2e2e2e] hover:shadow-[3px_3px_0px_#2e2e2e] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2e2e2e] rounded-[16px] border-2 border-black',
        outline: 'border-2 border-black bg-transparent text-[#825ef5] hover:bg-[#825ef5] hover:text-white focus-visible:ring-[#825ef5] shadow-[2px_2px_0px_#2e2e2e] rounded-[16px]',
        ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500 rounded-[12px]',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-[2px_2px_0px_#2e2e2e] rounded-[16px] border-2 border-black',
        success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-[2px_2px_0px_#2e2e2e] rounded-[16px] border-2 border-black',
        outlineDark: 'bg-white text-[#2e2e2e] border-2 border-black shadow-[2px_2px_0px_#2e2e2e] hover:shadow-[3px_3px_0px_#2e2e2e] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] rounded-[16px]',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-10 px-5 text-base',
        lg: 'h-14 px-8 text-base',
        xl: 'h-16 px-10 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
