import * as React from 'react'
import { FileText } from 'lucide-react'
import { cn } from '../lib/utils.js'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, description, icon, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-center text-center py-16 px-8', className)}
      {...props}
    >
      <div className="w-12 h-12 rounded-full bg-bg-muted flex items-center justify-center mb-4">
        {icon ?? <FileText size={24} className="text-text-tertiary" />}
      </div>
      <h3 className="text-h3 font-semibold text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-body text-text-tertiary max-w-[320px] mb-6">{description}</p>
      )}
      {action}
    </div>
  ),
)
EmptyState.displayName = 'EmptyState'
