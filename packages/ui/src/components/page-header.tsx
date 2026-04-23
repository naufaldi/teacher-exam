import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '../lib/utils'

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  onBack?: () => void
  backLabel?: string
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, subtitle, onBack, backLabel = 'Kembali', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-start justify-between pb-6 border-b border-border-default mb-6',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 mb-2 text-body-sm text-text-tertiary hover:text-text-primary transition-colors duration-[120ms]"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </button>
        )}
        <h1 className="text-h1 font-bold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-body text-text-tertiary mt-1">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {children}
        </div>
      )}
    </div>
  ),
)
PageHeader.displayName = 'PageHeader'
