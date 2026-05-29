import { Link } from '@tanstack/react-router'
import { Button } from '@teacher-exam/ui'
import { BookOpen } from 'lucide-react'

interface PublicPageShellProps {
  children: React.ReactNode
}

function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-bg-app">
      <header className="border-b border-border-default bg-bg-surface">
        <div className="max-w-[var(--container-app)] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-text-primary font-semibold">
            <BookOpen size={20} className="text-primary-600" aria-hidden />
            Ujian Sekolah
          </Link>
          <Button asChild variant="primary" size="sm">
            <Link to="/">Masuk</Link>
          </Button>
        </div>
      </header>
      <main className="max-w-[var(--container-app)] mx-auto px-6 py-8">{children}</main>
    </div>
  )
}

export { PublicPageShell }
