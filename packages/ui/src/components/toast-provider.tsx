import * as React from 'react'
import { createPortal } from 'react-dom'
import { Toast } from './toast'

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
  const timers = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  React.useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current.clear()
    }
  }, [])

  const dismiss = React.useCallback((id: string) => {
    // Phase 1: mark as dismissing for exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)),
    )
    // Phase 2: remove after animation completes
    const t = setTimeout(() => {
      timers.current.delete(t)
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, EXIT_DURATION)
    timers.current.add(t)
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
          return next.map((item, i) =>
            i < excess && !item.dismissing ? { ...item, dismissing: true } : item,
          )
        }
        return next
      })

      // Clean up excess toasts after animation
      const t = setTimeout(() => {
        timers.current.delete(t)
        setToasts((prev) => {
          if (prev.length > MAX_TOASTS) {
            return prev.slice(prev.length - MAX_TOASTS)
          }
          return prev
        })
      }, EXIT_DURATION)
      timers.current.add(t)
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
            role="region"
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
