import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button, Input, Label, PaperCard } from '@teacher-exam/ui'
import { GraduationCap, BookOpen, MapPin } from 'lucide-react'
import { api } from '../lib/api'
import type { Grade, UpdateProfileInput, UserProfile } from '@teacher-exam/shared'

export const Route = createFileRoute('/_auth/profile')({
  component: ProfilePage,
})

const ALL_GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6] as const
const SUBJECT_OPTIONS = [
  { value: 'bahasa_indonesia',     label: 'Bahasa Indonesia' },
  { value: 'pendidikan_pancasila', label: 'Pendidikan Pancasila' },
] as const
type SubjectValue = typeof SUBJECT_OPTIONS[number]['value']

function ProfilePage() {
  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [name, setName]               = useState('')
  const [school, setSchool]           = useState('')
  const [username, setUsername]       = useState('')
  const [grades, setGrades]           = useState<Grade[]>([])
  const [subjects, setSubjects]       = useState<SubjectValue[]>([])
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [savedAt, setSavedAt]         = useState<Date | null>(null)

  useEffect(() => {
    void api.me.get().then((p) => {
      setProfile(p)
      setName(p.name)
      setSchool(p.school ?? '')
      setUsername(p.username)
      setGrades([...(p.gradesTaught ?? [])])
      setSubjects([...((p.subjectsTaught ?? []) as SubjectValue[])])
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
    if (!name.trim()) return setError('Nama wajib diisi.')
    if (!school.trim()) return setError('Nama sekolah wajib diisi.')
    if (grades.length === 0) return setError('Pilih minimal satu kelas.')
    if (subjects.length === 0) return setError('Pilih minimal satu mata pelajaran.')
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return setError('Username harus 3-32 karakter (a-z, 0-9, titik, garis bawah, atau strip).')
    }

    setSubmitting(true)
    try {
      const payload: UpdateProfileInput = {
        name:           name.trim(),
        school:         school.trim(),
        username,
        gradesTaught:   grades,
        subjectsTaught: subjects,
      }
      const updated = await api.me.update(payload)
      setProfile(updated)
      setSavedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!profile) {
    return <div className='text-text-tertiary'>Memuat profil…</div>
  }

  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('')

  return (
    <div className='mx-auto max-w-[720px]'>
      <header className='mb-6 flex items-center gap-4'>
        {profile.image ? (
          <img
            src={profile.image}
            alt={profile.name}
            className='h-16 w-16 rounded-full object-cover ring-2 ring-bg-surface'
          />
        ) : (
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-white text-headline-sm font-bold'>
            {initials}
          </div>
        )}
        <div>
          <h1 className='text-display-sm font-bold text-text-primary'>{profile.name}</h1>
          <p className='text-body-sm text-text-tertiary'>{profile.email}</p>
        </div>
      </header>

      <PaperCard as='article' tilt={0} className='p-6 sm:p-8'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='name'>Nama lengkap</Label>
              <Input id='name' value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='username'>Username</Label>
              <Input
                id='username'
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                pattern='[a-z0-9._-]{3,32}'
                required
              />
            </div>
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='school' className='inline-flex items-center gap-2'>
              <MapPin size={14} aria-hidden='true' /> Sekolah
            </Label>
            <Input
              id='school'
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder='SD Negeri 1 Jakarta'
              required
            />
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
              {savedAt ? `Tersimpan ${savedAt.toLocaleTimeString('id-ID')}` : ' '}
            </p>
            <Button type='submit' disabled={submitting}>
              {submitting ? 'Menyimpan…' : 'Simpan perubahan'}
            </Button>
          </div>
        </form>
      </PaperCard>
    </div>
  )
}
