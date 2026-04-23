import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button, Input, Label, PaperCard } from '@teacher-exam/ui'
import { GraduationCap, BookOpen } from 'lucide-react'
import { api } from '../lib/api'
import { authClient } from '../lib/auth-client'
import type { Grade, UpdateProfileInput, UserProfile } from '@teacher-exam/shared'

export const Route = createFileRoute('/_auth/onboarding')({
  component: OnboardingPage,
})

const ALL_GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6] as const
const DEFAULT_GRADES: Grade[] = [5, 6]
const SUBJECT_OPTIONS = [
  { value: 'bahasa_indonesia',     label: 'Bahasa Indonesia' },
  { value: 'pendidikan_pancasila', label: 'Pendidikan Pancasila' },
] as const
type SubjectValue = typeof SUBJECT_OPTIONS[number]['value']

function OnboardingPage() {
  const navigate = useNavigate()

  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [school, setSchool]           = useState('')
  const [username, setUsername]       = useState('')
  const [grades, setGrades]           = useState<Grade[]>(DEFAULT_GRADES)
  const [subjects, setSubjects]       = useState<SubjectValue[]>(['bahasa_indonesia'])
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    void api.me.get().then((p) => {
      setProfile(p)
      setSchool(p.school ?? '')
      setUsername(p.username)
      if (p.gradesTaught?.length) setGrades([...p.gradesTaught])
      if (p.subjectsTaught?.length) setSubjects([...p.subjectsTaught] as SubjectValue[])
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Gagal memuat profil')
    })
  }, [])

  const toggleGrade = (g: Grade) => {
    setGrades((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g].sort()))
  }
  const toggleSubject = (s: SubjectValue) => {
    setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!school.trim()) return setError('Nama sekolah wajib diisi.')
    if (grades.length === 0) return setError('Pilih minimal satu kelas.')
    if (subjects.length === 0) return setError('Pilih minimal satu mata pelajaran.')
    if (!/^[a-z0-9._\-]{3,32}$/.test(username)) {
      return setError('Username harus 3-32 karakter (a-z, 0-9, titik, garis bawah, atau strip).')
    }

    setSubmitting(true)
    try {
      const payload: UpdateProfileInput = {
        school:         school.trim(),
        username,
        gradesTaught:   grades,
        subjectsTaught: subjects,
      }
      await api.me.update(payload)
      await authClient.getSession({ query: { disableCookieCache: true } })
      await navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='mx-auto max-w-[640px]'>
      <header className='mb-6 flex flex-col gap-2'>
        <span className='inline-flex w-fit items-center gap-2 rounded-pill bg-primary-50 px-3 py-1 text-caption font-semibold uppercase tracking-[0.08em] text-primary-700'>
          Lengkapi Profil
        </span>
        <h1 className='text-display-sm font-bold text-text-primary'>
          Sebentar lagi siap pakai
        </h1>
        <p className='text-body text-text-secondary'>
          Beri tahu kami sekolah dan kelas yang Anda ajar agar pembuatan soal lebih relevan.
        </p>
      </header>

      <PaperCard as='article' tilt={0} className='p-6 sm:p-8'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='school'>Nama sekolah</Label>
            <Input
              id='school'
              autoFocus
              required
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder='SD Negeri 1 Jakarta'
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='username'>Username</Label>
            <Input
              id='username'
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              pattern='[a-z0-9._\-]{3,32}'
              placeholder='nama.guru'
            />
            <p className='text-caption text-text-tertiary'>
              3-32 karakter: a-z, 0-9, titik, garis bawah, atau strip.
            </p>
          </div>

          <fieldset className='flex flex-col gap-3'>
            <legend className='text-body-sm font-medium text-text-secondary inline-flex items-center gap-2'>
              <GraduationCap size={16} aria-hidden='true' /> Kelas yang diajar
            </legend>
            <div className='flex flex-wrap gap-2'>
              {ALL_GRADES.map((g) => {
                const active = grades.includes(g)
                return (
                  <button
                    key={g}
                    type='button'
                    onClick={() => toggleGrade(g)}
                    aria-pressed={active}
                    className={`rounded-pill border px-4 py-1.5 text-body-sm font-medium transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-border-default bg-bg-surface text-text-tertiary hover:border-kertas-300 hover:bg-kertas-50'
                    }`}
                  >
                    Kelas {g}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className='flex flex-col gap-3'>
            <legend className='text-body-sm font-medium text-text-secondary inline-flex items-center gap-2'>
              <BookOpen size={16} aria-hidden='true' /> Mata pelajaran
            </legend>
            <div className='flex flex-wrap gap-2'>
              {SUBJECT_OPTIONS.map((opt) => {
                const active = subjects.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type='button'
                    onClick={() => toggleSubject(opt.value)}
                    aria-pressed={active}
                    className={`rounded-pill border px-4 py-1.5 text-body-sm font-medium transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-border-default bg-bg-surface text-text-tertiary hover:border-kertas-300 hover:bg-kertas-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {error ? (
            <div role='alert' className='rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-800'>
              {error}
            </div>
          ) : null}

          <div className='flex items-center justify-between gap-4 pt-2'>
            <p className='text-caption text-text-tertiary'>
              {profile ? `Masuk sebagai ${profile.email}` : ' '}
            </p>
            <Button type='submit' disabled={submitting}>
              {submitting ? 'Menyimpan…' : 'Selesaikan & lanjut'}
            </Button>
          </div>
        </form>
      </PaperCard>
    </div>
  )
}
