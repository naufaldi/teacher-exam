import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils.js'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-sm font-semibold',
    'transition-all duration-[120ms] ease-[cubic-bezier(0.4,0.0,0.2,1)]',
    'focus-visible:outline-none focus-visible:ring-3',
    'focus-visible:ring-[color:var(--color-border-focus)]/40',
    'focus-visible:ring-offset-2',
    'disabled:opacity-45 disabled:cursor-not-allowed',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-600 text-white',
          'hover:bg-primary-700 hover:-translate-y-px hover:shadow-md',
        ],
        secondary: [
          'bg-transparent text-[--color-text-primary] border border-[--color-border-ui]',
          'hover:bg-kertas-100',
        ],
        ghost: [
          'bg-transparent text-[--color-text-primary]',
          'hover:bg-kertas-100',
        ],
        danger: [
          'bg-danger-solid text-white',
          'hover:bg-[#9B1C1C] hover:-translate-y-px hover:shadow-md',
        ],
      },
      size: {
        sm:   'h-8 px-3 text-sm',
        md:   'h-10 px-4 text-sm',
        lg:   'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
