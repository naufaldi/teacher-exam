import * as React from 'react'
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from 'lucide-react'
import { Toaster as Sonner, toast } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * App-wide toast surface. Mount once near the root; trigger with `toast(...)`.
 * Themed against the warm-paper design tokens used by the rest of the UI package.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast pointer-events-auto flex items-start gap-3 rounded-md border border-border-default bg-bg-surface text-text-primary shadow-lg pl-4 pr-3 py-3',
          title: 'text-body-sm font-semibold text-text-primary',
          description: 'text-caption text-text-secondary',
          actionButton: 'bg-primary-600 text-white',
          cancelButton: 'bg-bg-muted text-text-secondary',
          success: 'border-success-border bg-success-bg [&_[data-icon]]:text-success-fg',
          error: 'border-danger-border bg-danger-bg [&_[data-icon]]:text-danger-fg',
          warning: 'border-warning-border bg-warning-bg [&_[data-icon]]:text-warning-fg',
          info: 'border-border-default bg-bg-surface [&_[data-icon]]:text-text-secondary',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
