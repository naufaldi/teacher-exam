import { Link } from "@tanstack/react-router"
import { Button, EmptyState, PageHeader } from "@teacher-exam/ui"

export type ComingSoonPageProps = {
  title: string
  subtitle: string
  icon: React.ReactNode
}

export function ComingSoonPage({ icon, subtitle, title }: ComingSoonPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        icon={icon}
        title="Segera hadir"
        description="Fitur ini sedang dalam pengembangan. Silakan kembali lagi nanti."
        action={
          <Button asChild>
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}
