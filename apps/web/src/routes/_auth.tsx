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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-app)' }}>
      <main style={{
        maxWidth: 'var(--container-app)',
        margin: '0 auto',
        padding: '32px 24px',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
