import * as React from 'react'
import { createPortal } from 'react-dom'
import { Toast } from './toast.js'

export interface ToastOptions {
  title: string
  description?: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: 'success' | 'error' | 'warning' | 'info'
  duration: number
  dismissing: boolean
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

let nextId = 0

const MAX_TOASTS = 3
const EXIT_DURATION = 300

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    // Phase 1: mark as dismissing for exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)),
    )
    // Phase 2: remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, EXIT_DURATION)
  }, [])

  const toast = React.useCallback(
    (opts: ToastOptions) => {
      const id = String(nextId++)
      const newToast: ToastItem = {
        id,
        title: opts.title,
        variant: opts.variant ?? 'info',
        duration: opts.duration ?? 5000,
        dismissing: false,
        ...(opts.description !== undefined ? { description: opts.description } : {}),
      }

      setToasts((prev) => {
        const next = [...prev, newToast]
        // If over max, mark oldest non-dismissing ones for removal
        if (next.length > MAX_TOASTS) {
          const excess = next.length - MAX_TOASTS
          return next.map((t, i) =>
            i < excess && !t.dismissing ? { ...t, dismissing: true } : t,
          )
        }
        return next
      })

      // Clean up excess toasts after animation
      setTimeout(() => {
        setToasts((prev) => {
          if (prev.length > MAX_TOASTS) {
            return prev.slice(prev.length - MAX_TOASTS)
          }
          return prev
        })
      }, EXIT_DURATION)
    },
    [],
  )

  const contextValue = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-label="Notifikasi"
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end"
          >
            {toasts.map((t) => (
              <Toast
                key={t.id}
                id={t.id}
                title={t.title}
                {...(t.description !== undefined ? { description: t.description } : {})}
                variant={t.variant}
                duration={t.duration}
                onDismiss={dismiss}
                dismissing={t.dismissing}
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (ctx === null) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
