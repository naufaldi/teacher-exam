import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '../lib/utils'

const toastVariants = cva(
  [
    'relative flex items-start gap-3 rounded-md border px-4 py-3 shadow-md',
    'min-w-[280px] max-w-[380px] w-full',
    'transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]',
  ],
  {
    variants: {
      variant: {
        success: 'bg-success-bg text-success-fg border-success-border',
        error: 'bg-danger-bg text-danger-fg border-danger-border',
        warning: 'bg-warning-bg text-warning-fg border-warning-border',
        info: 'bg-info-bg text-info-fg border-info-border',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
)

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const

export interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string
  title: string
  description?: string
  onDismiss: (id: string) => void
  duration?: number
  dismissing?: boolean
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      id,
      title,
      description,
      variant = 'info',
      onDismiss,
      duration = 5000,
      dismissing = false,
    },
    ref,
  ) => {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        onDismiss(id)
      }, duration)
      return () => clearTimeout(timer)
    }, [id, duration, onDismiss])

    const resolvedVariant: 'success' | 'error' | 'warning' | 'info' = variant ?? 'info'
    const IconComp = toastIcons[resolvedVariant]

    return (
      <div
        ref={ref}
        role={resolvedVariant === 'error' || resolvedVariant === 'warning' ? 'alert' : 'status'}
        aria-live={resolvedVariant === 'error' || resolvedVariant === 'warning' ? 'assertive' : 'polite'}
        aria-atomic="true"
        className={cn(
          toastVariants({ variant }),
          dismissing
            ? 'opacity-0 translate-x-4 scale-95'
            : 'opacity-100 translate-x-0 scale-100',
        )}
      >
        <IconComp size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{title}</p>
          {description !== undefined && (
            <p className="text-sm mt-0.5 opacity-80 leading-snug">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="shrink-0 rounded opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-opacity"
          aria-label="Tutup notifikasi"
        >
          <X size={16} />
        </button>
      </div>
    )
  },
)
Toast.displayName = 'Toast'
