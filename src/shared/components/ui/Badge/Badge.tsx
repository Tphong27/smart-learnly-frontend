import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        neutral: 'bg-[var(--sl-line-soft, #eef1f7)] text-[var(--sl-ink, #0f172a)]',
        purple: 'bg-[var(--sl-purple-soft, #f3eefe)] text-[var(--sl-purple-dark, #6d28d2)]',
        success: 'bg-[var(--sl-success-soft, #e7f8ee)] text-[#137333]',
        warning: 'bg-[var(--sl-warning-soft, #fff5d6)] text-[#8a5b00]',
        error: 'bg-[var(--sl-danger-soft, #fde7e7)] text-[#b91c1c]',
        info: 'bg-[var(--sl-info-soft, #e6efff)] text-[#2f5fbf]',
      },
    },
    defaultVariants: {
      variant: 'purple',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
