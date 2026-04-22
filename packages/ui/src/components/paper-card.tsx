import * as React from 'react'
import { cn } from '../lib/utils'

type PaperCardProps = React.HTMLAttributes<HTMLElement> & {
  tilt?: number
  as?: 'div' | 'article'
}

/**
 * PaperCard renders a tactile "exam paper sheet" surface used to preview
 * generated documents. The outer wrapper holds rotation so child content
 * stays axis-aligned for any inner micro-animation.
 */
const PaperCard = React.forwardRef<HTMLElement, PaperCardProps>(
  ({ className, style, tilt = -1.5, as = 'div', children, ...props }, ref) => {
    const Tag = as as 'div'
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        style={{ transform: `rotate(${tilt}deg)`, ...style }}
        className={cn(
          'group relative isolate rounded-md border border-border-default bg-bg-surface p-8 shadow-lg',
          'shadow-[0_16px_40px_rgba(26,20,16,0.14),0_4px_12px_rgba(26,20,16,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]',
          'transition-transform duration-[var(--duration-base)] ease-[var(--ease-std)]',
          'hover:-translate-y-0.5 hover:rotate-0',
          'before:pointer-events-none before:absolute before:inset-0 before:rounded-md',
          'before:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,rgba(122,110,87,0.04)_27px,rgba(122,110,87,0.04)_28px)]',
          className,
        )}
        {...props}
      >
        {children}
      </Tag>
    )
  },
)
PaperCard.displayName = 'PaperCard'

export { PaperCard }
export type { PaperCardProps }
