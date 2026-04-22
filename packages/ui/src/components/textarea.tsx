import * as React from 'react'
import { cn } from '../lib/utils.js'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-xs border border-border-ui bg-bg-surface px-3 py-2',
        'text-body text-text-primary placeholder:text-text-tertiary',
        'transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0.0,0.2,1)]',
        'focus-visible:outline-none',
        'focus-visible:ring-3 focus-visible:ring-[color:var(--color-border-focus)]/40 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-45',
        'md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
