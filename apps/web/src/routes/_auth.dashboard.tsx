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
      <h1 className="text-h1 font-bold text-text-primary mb-2">
        Selamat datang, {user.name}!
      </h1>
      <p className="text-body text-text-secondary">
        Dashboard sedang dalam pengembangan.
      </p>
    </div>
  )
}
