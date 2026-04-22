import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { BookOpen, LogOut } from 'lucide-react'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      if (!res.ok) throw new Error('unauthenticated')
      const session = await res.json() as { user?: { id: string; name: string; image?: string } } | null
      if (!session?.user) throw new Error('unauthenticated')
      return { user: session.user }
    } catch {
      throw redirect({ to: '/' })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { user } = Route.useRouteContext()
  const initials = user.name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-bg-app">
      <nav className="sticky top-0 z-10 bg-bg-surface border-b border-border-default shadow-xs h-[56px]">
        <div className="max-w-[var(--container-app)] mx-auto px-6 h-full flex items-center justify-between">
          {/* Left: brand */}
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary-600" />
            <span className="font-semibold text-text-primary">Ujian SD</span>
          </div>

          {/* Right: user info + logout */}
          <div className="flex items-center gap-3">
            <span className="text-body-sm text-text-secondary">{user.name}</span>
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-kertas-200 flex items-center justify-center">
                <span className="font-semibold text-text-primary text-sm">{initials}</span>
              </div>
            )}
            <a
              href="/api/auth/sign-out"
              className="text-body-sm text-text-tertiary hover:text-text-primary flex items-center gap-1.5 transition-colors duration-[120ms]"
            >
              <LogOut size={16} />
              Keluar
            </a>
          </div>
        </div>
      </nav>

      <div className="bg-bg-app min-h-[calc(100vh-56px)]">
        <main className="max-w-[var(--container-app)] mx-auto py-8 px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
