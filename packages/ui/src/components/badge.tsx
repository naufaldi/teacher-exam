import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1',
    'px-2 py-0.5',
    'text-caption font-medium',
    'border',
    'transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0.0,0.2,1)]',
  ],
  {
    variants: {
      variant: {
        default:    'rounded-xs bg-primary-50 text-primary-700 border-primary-200',
        secondary:  'rounded-xs bg-kertas-100 text-text-secondary border-border-default',
        success:    'rounded-xs bg-success-bg text-success-fg border-success-border',
        danger:     'rounded-xs bg-danger-bg text-danger-fg border-danger-border',
        warning:    'rounded-xs bg-warning-bg text-warning-fg border-warning-border',
        info:       'rounded-xs bg-info-bg text-info-fg border-info-border',
        'subject-bi':   'rounded-xs bg-subject-bi-bg text-subject-bi border-[color:var(--color-subject-bi)]/30',
        'subject-ppkn': 'rounded-xs bg-subject-ppkn-bg text-subject-ppkn border-[color:var(--color-subject-ppkn)]/30',
        pill:       'rounded-pill bg-kertas-100 text-text-secondary border-border-default',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
