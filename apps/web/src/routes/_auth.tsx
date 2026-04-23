import { createFileRoute, Outlet, redirect, Link, useNavigate } from '@tanstack/react-router'
import { LogOut, HelpCircle } from 'lucide-react'
import { Button } from '@teacher-exam/ui'
import { authClient, signOut } from '../lib/auth-client'

const NAV_LINKS = [
  { to: '/dashboard' as const, label: 'Dashboard' },
  { to: '/history' as const, label: 'Riwayat' },
  { to: '/generate' as const, label: 'Generate' },
] as const

const DEV_USER = {
  id: 'dev-user-001',
  name: 'Sari Wulandari',
  username: 'sari.wulandari',
  email: 'sari.wulandari@dev.local',
  image: null as string | null,
  profileCompleted: true,
} as const

type RouteUser = {
  id: string
  name: string
  username?: string
  email: string
  image?: string | null
  profileCompleted?: boolean
}

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    if (import.meta.env['VITE_AUTH_BYPASS'] === '1') {
      return { user: DEV_USER as RouteUser }
    }

    const session = await authClient.getSession()
    const user = session?.data?.user as RouteUser | undefined
    if (!user) {
      throw redirect({ to: '/', search: { reason: 'session_expired' } })
    }

    if (user.profileCompleted === false && location.pathname !== '/onboarding') {
      throw redirect({ to: '/onboarding' })
    }

    return { user }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('')

  const handleLogout = async () => {
    await signOut()
    await navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-bg-app">
      <nav className="sticky top-0 z-10 bg-bg-surface border-b border-border-default shadow-xs h-[56px]">
        <div className="max-w-[var(--container-app)] mx-auto px-6 h-full flex items-center">
          {/* Brand */}
          <a href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/assets/logo-mark.svg"
              alt="Ujian SD logo"
              className="w-7 h-7"
            />
            <span className="font-extrabold text-[17px] tracking-[-0.01em] text-text-primary">
              Ujian<span className="text-primary-600"> SD</span>
            </span>
          </a>

          {/* Nav links — hidden on small screens */}
          <div className="hidden md:flex items-center gap-1 ml-5">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-3 py-2 text-body-sm font-medium text-text-tertiary rounded-sm transition-colors duration-[120ms] hover:bg-kertas-100 hover:text-text-primary"
                activeProps={{
                  className: 'bg-primary-50 text-primary-700 font-semibold',
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Help button */}
            <Button variant="ghost" size="icon" aria-label="Bantuan">
              <HelpCircle size={18} />
            </Button>

            {/* Teacher pill -> /profile */}
            <Link
              to="/profile"
              className="flex items-center gap-2.5 py-1 pl-3 pr-1.5 border border-border-default rounded-pill bg-bg-surface text-body-sm font-medium hover:border-kertas-300 hover:bg-kertas-50 transition-colors duration-[120ms]"
            >
              <span className="text-text-primary">{user.name}</span>
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                  <span className="font-bold text-white text-[12px] tracking-wide">{initials}</span>
                </div>
              )}
            </Link>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="text-body-sm text-text-tertiary hover:text-text-primary flex items-center gap-1.5 transition-colors duration-[120ms] ml-1"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
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
