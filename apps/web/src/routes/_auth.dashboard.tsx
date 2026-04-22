import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Sparkles,
  FolderOpen,
  PrinterIcon,
  CheckCircle,
  FileText,
  Plus,
} from 'lucide-react'
import { Button } from '@teacher-exam/ui'
import { Badge } from '@teacher-exam/ui'
import { Card } from '@teacher-exam/ui'
import { EmptyState } from '@teacher-exam/ui'
import { MOCK_TEACHER, getMockExams } from '../lib/mock-data.js'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardPage,
})

const SUBJECT_LABELS: Record<string, string> = {
  bahasa_indonesia: 'Bahasa Indonesia',
  pendidikan_pancasila: 'Pendidikan Pancasila',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function DashboardPage() {
  const navigate = useNavigate()
  const exams = getMockExams()
  const finalExams = exams.filter((e) => e.status === 'final')
  const lastExam = exams[0]

  const firstName = MOCK_TEACHER.name.split(' ')[0]

  return (
    <div className='space-y-8'>
      {/* Greeting section */}
      <div className='animate-fade-up' style={{ '--index': 0 } as React.CSSProperties}>
        <h1 className='text-h1 font-bold text-text-primary'>
          Selamat datang, Bu {firstName}!
        </h1>
        <p className='text-body text-text-secondary mt-1'>
          {exams.length} lembar tersimpan ({finalExams.length} final)
        </p>
      </div>

      {/* Bento grid */}
      <div className='grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6'>
        {/* Large card — Generate */}
        <Card
          className='animate-fade-up-stagger p-6'
          style={{ '--index': 1 } as React.CSSProperties}
        >
          <div className='flex items-center gap-2'>
            <Sparkles size={20} className='text-primary-600' />
            <h2 className='text-h3 font-semibold text-text-primary'>Generate Lembar Soal</h2>
          </div>
          <p className='text-body text-text-secondary mt-2'>
            Buat 20 soal pilihan ganda otomatis dari PDF materi atau topik pilihan Anda.
          </p>
          <div className='mt-6'>
            <Button
              variant='primary'
              onClick={() => void navigate({ to: '/dashboard' })}
            >
              <Sparkles size={16} />
              Generate Lembar
            </Button>
          </div>
        </Card>

        {/* Small card — Riwayat */}
        <Card
          className='animate-fade-up-stagger p-6'
          style={{ '--index': 2 } as React.CSSProperties}
        >
          <div className='flex items-center gap-2'>
            <FolderOpen size={20} className='text-text-tertiary' />
            <h2 className='text-h3 font-semibold text-text-primary'>Riwayat Ujian</h2>
          </div>
          <div className='mt-2'>
            <Badge variant='secondary'>{exams.length} ujian</Badge>
          </div>
          <p className='text-body-sm text-text-secondary mt-2'>
            Akses dan cetak lembar ujian yang sudah tersimpan.
          </p>
          <div className='mt-6'>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => void navigate({ to: '/dashboard' })}
            >
              Lihat Semua
            </Button>
          </div>
        </Card>
      </div>

      {/* Last exam section */}
      <div
        className='animate-fade-up-stagger'
        style={{ '--index': 3 } as React.CSSProperties}
      >
        <h2 className='text-h3 font-semibold text-text-primary mb-4'>Lembar Terakhir</h2>

        {lastExam ? (
          <Card className='p-4'>
            <div className='flex items-center justify-between flex-wrap gap-4'>
              <div>
                <p className='text-body font-medium text-text-primary'>{lastExam.title}</p>
                <div className='flex items-center gap-2 mt-1'>
                  <Badge variant='pill'>
                    {SUBJECT_LABELS[lastExam.subject] ?? lastExam.subject}
                  </Badge>
                  <span className='text-caption text-text-tertiary'>
                    {formatDate(lastExam.createdAt)}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => void navigate({ to: '/dashboard' })}
                >
                  <PrinterIcon size={14} />
                  Cetak
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => void navigate({ to: '/dashboard' })}
                >
                  <CheckCircle size={14} />
                  Koreksi
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<FileText size={24} className='text-text-tertiary' />}
            title='Belum ada lembar tersimpan'
            description='Mulai dengan generate lembar pertama Anda.'
            action={
              <Button
                variant='primary'
                onClick={() => void navigate({ to: '/dashboard' })}
              >
                <Plus size={16} />
                Generate Lembar
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
