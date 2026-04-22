import * as React from 'react'
import { cn } from '../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xs border border-border-ui bg-bg-surface px-3 py-2',
          'text-body text-text-primary',
          'placeholder:text-text-disabled',
          'transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0.0,0.2,1)]',
          'focus-visible:outline-none',
          'focus-visible:ring-3 focus-visible:ring-[color:var(--color-border-focus)]/40 focus-visible:ring-offset-2',
          'disabled:opacity-45 disabled:cursor-not-allowed',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
