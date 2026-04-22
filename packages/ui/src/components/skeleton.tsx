import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils.js'

const skeletonVariants = cva(
  'bg-kertas-200 animate-pulse',
  {
    variants: {
      variant: {
        default: 'block rounded-sm',
        text: 'h-4 rounded-xs max-w-[200px] block',
        circle: 'rounded-full aspect-square block',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(skeletonVariants({ variant, className }))}
      {...props}
    />
  ),
)
Skeleton.displayName = 'Skeleton'
