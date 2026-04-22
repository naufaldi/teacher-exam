import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, XCircle, Pencil, RefreshCw, ChevronRight } from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  PageHeader,
} from '@teacher-exam/ui'
import { MOCK_EXAM_WITH_QUESTIONS, MOCK_EXAM_FINAL } from '../lib/mock-data.js'

export const Route = createFileRoute('/_auth/review')({
  component: ReviewPage,
  validateSearch: (search) => ({
    mode: (search['mode'] as 'fast' | 'slow') ?? 'fast',
  }),
})

type QuestionStatus = 'pending' | 'accepted' | 'rejected'

function ReviewPage() {
  const { mode } = Route.useSearch()
  const navigate = useNavigate()

  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>(
    () =>
      Object.fromEntries(
        MOCK_EXAM_WITH_QUESTIONS.questions.map((q) => [
          q.id,
          mode === 'fast' ? 'accepted' : 'pending',
        ]),
      ),
  )

  const [sekolah, setSekolah] = useState(MOCK_EXAM_FINAL.schoolName ?? '')
  const [tahunPelajaran, setTahunPelajaran] = useState(MOCK_EXAM_FINAL.academicYear ?? '')
  const [jenisUjian, setJenisUjian] = useState(MOCK_EXAM_FINAL.examType ?? 'TKA')
  const [tanggal, setTanggal] = useState(MOCK_EXAM_FINAL.examDate ?? '')
  const [durasi, setDurasi] = useState(String(MOCK_EXAM_FINAL.durationMinutes ?? 60))
  const [petunjuk, setPetunjuk] = useState(MOCK_EXAM_FINAL.instructions ?? '')

  const questions = MOCK_EXAM_WITH_QUESTIONS.questions
  const acceptedCount = Object.values(questionStatuses).filter((s) => s === 'accepted').length
  const isMetadataComplete = sekolah && tahunPelajaran && jenisUjian && tanggal && durasi
  const canPreview = acceptedCount === 20 && isMetadataComplete

  return (
    <div className='space-y-6'>
      {/* PageHeader */}
      {mode === 'fast' ? (
        <PageHeader
          title='Konfirmasi Paket'
          subtitle='20 soal auto-diterima'
          onBack={() => { void navigate({ to: '/generate' }) }}
        >
          <Badge variant='secondary'>Mode Cepat</Badge>
        </PageHeader>
      ) : (
        <PageHeader
          title={`Review (${questions.length} soal)`}
          onBack={() => { void navigate({ to: '/generate' }) }}
        >
          <Badge variant='secondary'>{acceptedCount} dari 20 siap</Badge>
        </PageHeader>
      )}

      {/* Fast Track Mode */}
      {mode === 'fast' && (
        <div>
          {/* Bulk action bar */}
          <div className='flex items-center justify-between mb-4'>
            <span className='text-body-sm text-text-secondary'>20 soal auto-diterima</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => void navigate({ to: '/review', search: { mode: 'slow' } })}
            >
              Switch ke Review Detail
            </Button>
          </div>

          {/* Question list */}
          <div className='max-h-[480px] overflow-y-auto rounded-sm border border-border-default divide-y divide-border-default'>
            {questions.map((q) => (
              <div
                key={q.id}
                className='flex items-center gap-3 px-4 py-3 hover:bg-kertas-50 transition-colors'
              >
                <span className='text-caption text-text-tertiary font-mono w-6 shrink-0'>
                  {q.number}.
                </span>
                <p className='flex-1 text-body-sm text-text-primary truncate'>
                  {q.text.split('\n')[0]}
                </p>
                <span className='font-mono text-caption bg-bg-muted px-1.5 py-0.5 rounded-xs shrink-0'>
                  {q.correctAnswer.toUpperCase()}
                </span>
                {q.topic && (
                  <Badge variant='secondary' className='text-caption shrink-0'>
                    {q.topic.split(' ')[0]}
                  </Badge>
                )}
                <button
                  type='button'
                  className='p-1 text-text-tertiary hover:text-text-primary transition-colors shrink-0'
                >
                  <Pencil className='h-3.5 w-3.5' />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slow Track Mode */}
      {mode === 'slow' && (
        <div>
          {/* Bulk action bar */}
          <div className='flex items-center gap-3 mb-6'>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                setQuestionStatuses(
                  Object.fromEntries(
                    questions.map((q) => [q.id, 'accepted' as QuestionStatus]),
                  ),
                )
              }}
            >
              Terima Semua
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setQuestionStatuses((prev) =>
                  Object.fromEntries(
                    questions.map((q) => [
                      q.id,
                      prev[q.id] === 'rejected' ? ('pending' as QuestionStatus) : (prev[q.id] ?? 'pending'),
                    ]),
                  ),
                )
              }}
            >
              Ganti ditolak
            </Button>
          </div>

          {/* Question cards */}
          <div className='space-y-4'>
            {questions.map((q) => {
              const status = questionStatuses[q.id] ?? 'pending'
              return (
                <Card
                  key={q.id}
                  className={`border-l-4 transition-colors ${
                    status === 'accepted'
                      ? 'border-l-success-solid opacity-75'
                      : status === 'rejected'
                        ? 'border-l-danger-solid'
                        : 'border-l-border-default'
                  }`}
                >
                  <CardContent className='p-4'>
                    {/* Header: number + difficulty badge + topic chip */}
                    <div className='flex items-center gap-2 mb-3'>
                      <span className='font-mono text-caption text-text-tertiary'>{q.number}.</span>
                      {q.difficulty && (
                        <Badge variant='secondary' className='text-caption'>
                          {q.difficulty}
                        </Badge>
                      )}
                      {q.topic && (
                        <span className='text-caption text-text-tertiary'>{q.topic}</span>
                      )}
                      {status === 'rejected' && (
                        <span className='ml-auto text-caption text-danger-fg'>Perlu diganti</span>
                      )}
                    </div>
                    {/* Question text */}
                    <p className='text-body text-text-primary mb-3 whitespace-pre-line'>{q.text}</p>
                    {/* Options */}
                    <div className='grid grid-cols-2 gap-1 mb-4'>
                      {(['a', 'b', 'c', 'd'] as const).map((letter) => (
                        <div
                          key={letter}
                          className={`text-body-sm px-3 py-1.5 rounded-xs flex gap-2 ${
                            q.correctAnswer === letter
                              ? 'bg-success-bg text-success-fg font-medium'
                              : 'text-text-secondary'
                          }`}
                        >
                          <span className='font-mono text-caption shrink-0'>
                            {letter.toUpperCase()}.
                          </span>
                          <span>
                            {q[`option${letter.toUpperCase() as 'A' | 'B' | 'C' | 'D'}`]}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Action buttons */}
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='secondary'
                        className='text-success-fg border-success-border'
                        onClick={() =>
                          setQuestionStatuses((prev) => ({ ...prev, [q.id]: 'accepted' }))
                        }
                      >
                        <CheckCircle2 className='h-3.5 w-3.5 mr-1.5' /> Terima
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => {
                          /* edit — noop for now */
                        }}
                      >
                        <Pencil className='h-3.5 w-3.5 mr-1.5' /> Edit
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='text-danger-fg hover:text-danger-fg'
                        onClick={() =>
                          setQuestionStatuses((prev) => ({ ...prev, [q.id]: 'rejected' }))
                        }
                      >
                        <XCircle className='h-3.5 w-3.5 mr-1.5' /> Tolak
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Metadata form */}
      <div className='mt-8 space-y-5'>
        <h3 className='text-h3 font-semibold text-text-primary'>Detail Lembar Ujian</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
          {/* Sekolah */}
          <div className='space-y-1.5'>
            <Label htmlFor='sekolah'>Nama Sekolah</Label>
            <Input
              id='sekolah'
              value={sekolah}
              onChange={(e) => setSekolah(e.target.value)}
              placeholder='SD Negeri ...'
            />
          </div>
          {/* Tahun Pelajaran */}
          <div className='space-y-1.5'>
            <Label htmlFor='tahun'>Tahun Pelajaran</Label>
            <Input
              id='tahun'
              value={tahunPelajaran}
              onChange={(e) => setTahunPelajaran(e.target.value)}
              placeholder='2025/2026'
            />
          </div>
          {/* Jenis Ujian */}
          <div className='space-y-1.5'>
            <Label htmlFor='jenis'>Jenis Ujian</Label>
            <Select value={jenisUjian} onValueChange={setJenisUjian}>
              <SelectTrigger id='jenis'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='TKA'>TKA</SelectItem>
                <SelectItem value='UTS'>UTS</SelectItem>
                <SelectItem value='UAS'>UAS</SelectItem>
                <SelectItem value='Ulangan Harian'>Ulangan Harian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Tanggal */}
          <div className='space-y-1.5'>
            <Label htmlFor='tanggal'>Tanggal Ujian</Label>
            <Input
              id='tanggal'
              type='date'
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          {/* Durasi */}
          <div className='space-y-1.5'>
            <Label htmlFor='durasi'>Durasi (menit)</Label>
            <Input
              id='durasi'
              value={durasi}
              onChange={(e) => setDurasi(e.target.value)}
              placeholder='60'
            />
          </div>
        </div>
        {/* Petunjuk — full width */}
        <div className='space-y-1.5'>
          <Label htmlFor='petunjuk'>Petunjuk Pengerjaan</Label>
          <Textarea
            id='petunjuk'
            value={petunjuk}
            onChange={(e) => setPetunjuk(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className='flex items-center justify-between mt-8 pt-6 border-t border-border-default'>
        <div className='flex gap-3'>
          <Button variant='secondary' onClick={() => void navigate({ to: '/generate' })}>
            <RefreshCw className='h-4 w-4 mr-2' /> Regenerate
          </Button>
          {mode === 'fast' && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => void navigate({ to: '/review', search: { mode: 'slow' } })}
            >
              Switch ke Review Detail
            </Button>
          )}
        </div>
        <Button disabled={!canPreview} onClick={() => void navigate({ to: '/preview' as '/' })}>
          <ChevronRight className='h-4 w-4 mr-2' /> Preview Lembar
        </Button>
      </div>
    </div>
  )
}
