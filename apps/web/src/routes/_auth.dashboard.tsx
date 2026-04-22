import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/dashboard')({
  loader: async () => {
    const res = await fetch('/api/auth/get-session', { credentials: 'include' })
    const session = await res.json() as { user?: { name: string; image?: string } } | null
    return { user: session?.user ?? { name: 'Guru' } }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useLoaderData()
  return (
    <div>
      <h1 style={{
        fontSize: '32px',
        lineHeight: '40px',
        fontWeight: '700',
        color: 'var(--color-text-primary)',
        marginBottom: '8px',
      }}>
        Selamat datang, {user.name}!
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
        Dashboard sedang dalam pengembangan.
      </p>
    </div>
  )
}
