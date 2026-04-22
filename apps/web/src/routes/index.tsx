import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-app)' }}>
      <div className="w-full max-w-sm text-center" style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-md)',
        padding: '40px',
      }}>
        <img src="/logo-wordmark.svg" alt="Ujian SD" style={{ height: '48px', margin: '0 auto 24px' }} />
        <h1 style={{
          fontSize: '24px',
          lineHeight: '32px',
          fontWeight: '700',
          color: 'var(--color-text-primary)',
          marginBottom: '8px',
        }}>
          Generator Soal Ujian
        </h1>
        <p style={{
          fontSize: '15px',
          lineHeight: '22px',
          color: 'var(--color-text-secondary)',
          marginBottom: '32px',
        }}>
          SD Kelas 5 &amp; 6 — Kurikulum Merdeka
        </p>
        <a
          href="/api/auth/sign-in/google"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            height: '40px',
            padding: '0 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-primary-600)',
            color: '#FFFFFF',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
            transition: 'background-color 120ms cubic-bezier(0.4,0.0,0.2,1)',
          }}
        >
          Masuk dengan Google
        </a>
      </div>
    </div>
  )
}
