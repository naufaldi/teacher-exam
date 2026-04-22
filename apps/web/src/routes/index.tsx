import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@teacher-exam/ui'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app">
      <div className="w-full max-w-sm text-center bg-bg-surface rounded-md shadow-md p-10">
        <img
          src="/logo-wordmark.svg"
          alt="Ujian SD"
          className="h-12 mx-auto mb-6"
        />
        <h1 className="text-h2 font-bold text-text-primary mb-2">
          Generator Soal Ujian
        </h1>
        <p className="text-body text-text-secondary mb-8">
          SD Kelas 5 &amp; 6 — Kurikulum Merdeka
        </p>
        <Button asChild variant="primary" size="md" className="w-full">
          <a href="/api/auth/sign-in/google">
            Masuk dengan Google
          </a>
        </Button>
      </div>
    </div>
  )
}
