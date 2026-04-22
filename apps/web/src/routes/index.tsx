import { createFileRoute, redirect } from '@tanstack/react-router'
import { PaperCard } from '@teacher-exam/ui'
import { BookOpen, Check, Printer } from 'lucide-react'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      if (res.ok) {
        const session = await res.json() as { user?: { id: string } } | null
        if (session?.user) {
          throw redirect({ to: '/dashboard' })
        }
      }
    } catch (e) {
      // If the thrown value is a redirect, re-throw it
      if (e instanceof Error === false) throw e
      // Otherwise swallow fetch errors — just show the login page
    }
  },
  component: LoginPage,
})

function GoogleIcon() {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 20 20'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <path
        d='M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z'
        fill='#4285F4'
      />
      <path
        d='M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H1.064v2.59A9.996 9.996 0 0010 20z'
        fill='#34A853'
      />
      <path
        d='M4.404 11.9A6.012 6.012 0 014.09 10c0-.663.114-1.305.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z'
        fill='#FBBC05'
      />
      <path
        d='M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0A9.996 9.996 0 001.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z'
        fill='#EA4335'
      />
    </svg>
  )
}

const TRUST_POINTS = [
  'Print A4 siap pakai',
  'Bahasa Indonesia & Pendidikan Pancasila',
  'Gratis untuk guru SD',
] as const

function LoginPage() {
  return (
    <div className='min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] bg-bg-app'>
      {/* Left column — brand and auth */}
      <section className='relative flex flex-col px-6 sm:px-10 lg:px-16 xl:px-20 py-10 lg:py-12'>
        <header
          className='animate-fade-up-stagger flex items-center gap-2'
          style={{ ['--index' as string]: 0 }}
        >
          <BookOpen size={22} className='text-primary-600' strokeWidth={2} />
          <span className='font-semibold text-text-primary text-body-lg'>
            Ujian SD
          </span>
        </header>

        <div className='my-auto flex flex-col gap-6 max-w-[460px] py-12'>
          <span
            className='animate-fade-up-stagger inline-flex items-center self-start gap-2 rounded-pill bg-primary-50 px-3 py-1 text-caption font-semibold tracking-[0.08em] uppercase text-primary-700'
            style={{ ['--index' as string]: 1 }}
          >
            Kurikulum Merdeka · Kelas 5 &amp; 6
          </span>

          <h1
            className='animate-fade-up-stagger text-display font-bold text-text-primary tracking-tight leading-[1.05]'
            style={{ ['--index' as string]: 2 }}
          >
            Buat Soal Ujian SD
            <br />
            <span className='text-primary-600'>dengan Mudah</span>
          </h1>

          <p
            className='animate-fade-up-stagger text-body-lg text-text-secondary'
            style={{ ['--index' as string]: 3 }}
          >
            Susun, ekspor, dan cetak lembar ujian rapi dalam hitungan menit —
            tanpa pusing format.
          </p>

          <div
            className='animate-fade-up-stagger flex flex-col gap-4 pt-2'
            style={{ ['--index' as string]: 4 }}
          >
            <a
              href='/api/auth/sign-in/google?callbackURL=/dashboard'
              aria-label='Masuk dengan akun Google'
              className='inline-flex items-center justify-center gap-3 self-start rounded-sm border border-border-ui bg-bg-surface px-6 py-3 text-body font-medium text-text-primary shadow-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform duration-[var(--duration-fast)] ease-[var(--ease-std)] hover:bg-kertas-50 active:scale-[0.97]'
            >
              <GoogleIcon />
              Masuk dengan Google
            </a>

            <ul className='flex flex-col gap-2 pt-2'>
              {TRUST_POINTS.map((point) => (
                <li
                  key={point}
                  className='flex items-center gap-2 text-body-sm text-text-tertiary'
                >
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    className='text-secondary-500 shrink-0'
                    aria-hidden='true'
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer
          className='animate-fade-up-stagger mt-auto pt-8 text-caption text-text-tertiary'
          style={{ ['--index' as string]: 5 }}
        >
          SD Kelas 5 &amp; 6 · Sesuai Kurikulum Merdeka · Dibuat untuk guru
          Indonesia.
        </footer>
      </section>

      {/* Right column — paper preview */}
      <aside className='relative hidden lg:flex items-center justify-center overflow-hidden bg-kertas-100 p-12'>
        <div
          className='absolute inset-0 opacity-[0.06] pointer-events-none'
          style={{
            backgroundImage:
              'radial-gradient(circle, #7A6E57 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden='true'
        />

        <div className='relative w-full max-w-[420px]'>
          <PaperCard
            as='article'
            tilt={-1.5}
            className='animate-fade-up-stagger flex flex-col gap-6 px-10 py-12'
            style={{ ['--index' as string]: 2 }}
            aria-label='Contoh lembar ujian'
          >
            <div className='border-b border-kertas-300 pb-5 text-center'>
              <p className='font-serif font-bold text-exam-kop tracking-[0.03em] text-text-primary'>
                ULANGAN HARIAN
              </p>
              <p className='mt-1 font-serif text-exam-body text-text-secondary'>
                Bahasa Indonesia · Kelas 6 · Semester Ganjil
              </p>
            </div>

            <dl className='grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-caption text-text-tertiary'>
              <div className='flex gap-1'>
                <dt>Nama</dt>
                <dd className='flex-1 border-b border-dotted border-kertas-300'>:</dd>
              </div>
              <div className='flex gap-1'>
                <dt>Kelas</dt>
                <dd className='flex-1 border-b border-dotted border-kertas-300'>:</dd>
              </div>
              <div className='flex gap-1 col-span-2'>
                <dt>Hari/Tanggal</dt>
                <dd className='flex-1 border-b border-dotted border-kertas-300'>:</dd>
              </div>
            </dl>

            <div className='flex flex-col gap-3 font-serif text-exam-body text-text-primary leading-snug'>
              <p>
                <span className='font-bold'>1.</span> Ide pokok dalam sebuah
                paragraf disebut juga&hellip;
              </p>
              <ol className='flex flex-col gap-1.5 pl-5' type='a'>
                <li className='flex gap-2'>
                  <span className='font-mono text-text-tertiary'>a.</span>
                  <span>kalimat penjelas</span>
                </li>
                <li className='flex gap-2 -mx-2 px-2 py-0.5 rounded-xs bg-accent-50'>
                  <span className='font-mono text-text-tertiary'>b.</span>
                  <span>gagasan utama</span>
                </li>
                <li className='flex gap-2'>
                  <span className='font-mono text-text-tertiary'>c.</span>
                  <span>kalimat tanya</span>
                </li>
                <li className='flex gap-2'>
                  <span className='font-mono text-text-tertiary'>d.</span>
                  <span>kalimat seru</span>
                </li>
              </ol>
            </div>

            <div className='mt-2 flex items-center justify-between border-t border-kertas-200 pt-4 font-mono text-caption text-text-tertiary'>
              <span className='inline-flex items-center gap-1'>
                <Printer size={12} strokeWidth={2} aria-hidden='true' />
                A4 · 1 dari 4
              </span>
              <span>Kop Sekolah</span>
            </div>
          </PaperCard>

          <span
            aria-hidden='true'
            className='absolute -top-3 -right-3 rotate-12 rounded-pill border-2 border-primary-600/70 bg-bg-surface/70 px-3 py-1 text-caption font-bold tracking-[0.12em] text-primary-600/80 shadow-xs backdrop-blur-sm'
          >
            LULUS KURIKULUM
          </span>
        </div>

        <div
          className='absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-kertas-100 to-transparent pointer-events-none'
          aria-hidden='true'
        />
      </aside>
    </div>
  )
}
