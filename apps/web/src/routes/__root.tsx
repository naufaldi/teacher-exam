import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { EmptyState, ToastProvider, Button } from '@teacher-exam/ui'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
})

function RootLayout() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-bg-app]">
      <EmptyState
        title="Halaman tidak ditemukan"
        description="Halaman yang Anda cari tidak ada."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}

interface ErrorPageProps {
  error: Error
  reset: () => void
}

function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-bg-app]">
      <div className="flex flex-col items-center text-center py-16 px-8 max-w-md">
        <div className="w-12 h-12 rounded-full bg-[--color-danger-bg] flex items-center justify-center mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[--color-danger-fg]"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-h3 font-semibold text-[--color-text-primary] mb-2">
          Terjadi kesalahan
        </h3>
        <p className="text-body text-[--color-text-tertiary] max-w-[320px] mb-6">
          Maaf, terjadi kesalahan yang tidak terduga. Silakan coba muat ulang halaman.
        </p>
        {import.meta.env.DEV && error.message && (
          <pre className="text-xs text-left bg-[--color-danger-bg] text-[--color-danger-fg] border border-[--color-danger-border] rounded-md px-3 py-2 mb-6 w-full overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={reset}
        >
          Coba Lagi
        </Button>
      </div>
    </div>
  )
}
