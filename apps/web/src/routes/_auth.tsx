import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

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
  return (
    <div className="min-h-screen bg-bg-app">
      <main className="max-w-[var(--container-app)] mx-auto py-8 px-6">
        <Outlet />
      </main>
    </div>
  )
}
