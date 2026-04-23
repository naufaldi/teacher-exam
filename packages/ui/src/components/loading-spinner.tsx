import * as React from 'react'
import { cn } from '../lib/utils'

export interface LoadingSpinnerProps {
  message?: string
  className?: string
}

export function LoadingSpinner({ message, className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-screen gap-4',
        className,
      )}
      role="status"
      aria-label={message ?? 'Memuat...'}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-full border-4',
          'border-kertas-200 border-t-primary-600',
          'animate-spin',
        )}
        aria-hidden="true"
      />
      {message !== undefined && (
        <p className="text-sm text-[--color-text-tertiary] font-medium">{message}</p>
      )}
    </div>
  )
}
