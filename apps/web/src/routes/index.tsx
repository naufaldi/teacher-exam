import { createFileRoute } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'

export const Route = createFileRoute('/')({
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

function LoginPage() {
  return (
    <div className='min-h-[100dvh] flex'>
      {/* Left column — main content */}
      <div className='relative flex-[3] bg-bg-app flex flex-col justify-center px-12 py-16 lg:px-20'>
        {/* Logo */}
        <div className='absolute top-8 left-12 lg:left-20 flex items-center gap-2'>
          <BookOpen size={24} className='text-primary-600' />
          <span className='font-semibold text-text-primary text-body-lg'>
            Ujian SD
          </span>
        </div>

        {/* Heading */}
        <h1 className='animate-fade-up text-display font-bold text-text-primary tracking-tight leading-tight'>
          Buat Soal Ujian SD<br />dengan Mudah
        </h1>

        {/* Subtitle */}
        <p className='animate-fade-up mt-4 text-body-lg text-text-secondary max-w-[480px]'>
          Sesuai Kurikulum Merdeka — Bahasa Indonesia &amp; Pendidikan Pancasila
        </p>

        {/* Google login button */}
        <div className='mt-10'>
          <a
            href='/api/auth/sign-in/google'
            className='inline-flex items-center gap-3 px-6 py-3 bg-bg-surface border border-border-ui rounded-sm shadow-xs text-body font-medium text-text-primary hover:bg-kertas-50 transition-colors duration-[120ms]'
          >
            <GoogleIcon />
            Masuk dengan Google
          </a>
        </div>

        {/* Footer label */}
        <p className='mt-auto pt-16 text-caption text-text-tertiary'>
          SD Kelas 5 &amp; 6 · Kurikulum Merdeka
        </p>
      </div>

      {/* Right column — decorative */}
      <div className='hidden lg:flex flex-[2] bg-kertas-100 items-center justify-center relative overflow-hidden'>
        {/* Dots pattern */}
        <div
          className='absolute inset-0 opacity-5'
          style={{
            backgroundImage:
              'radial-gradient(circle, #7A6E57 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Large decorative wordmark */}
        <span className='-rotate-6 text-[96px] font-[800] text-kertas-200 leading-none select-none tracking-tighter'>
          UJIAN SD
        </span>

        {/* Left edge gradient fade */}
        <div className='absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-kertas-100 to-transparent' />
      </div>
    </div>
  )
}
