import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Sparkles, Lock } from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  FileUpload,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Textarea,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Skeleton,
  PageHeader,
} from '@teacher-exam/ui'

export const Route = createFileRoute('/_auth/generate')({
  component: GeneratePage,
})

const TOPIK_BI = [
  'Pemahaman Bacaan',
  'Ide Pokok dan Gagasan Pendukung',
  'Unsur Intrinsik Cerita',
  'Kosakata (Denotatif, Konotatif, Kiasan)',
  'Teks Eksplanasi',
  'Gaya Bahasa / Majas',
  'Tanda Baca dan Ejaan',
]

const TOPIK_PPKN = [
  'Nilai-nilai Pancasila',
  'Norma dan Hukum',
  'Hak dan Kewajiban',
  'Keberagaman Budaya',
  'Musyawarah dan Mufakat',
]

const SUBJECT_LABELS: Record<string, string> = {
  bahasa_indonesia: 'Bahasa Indonesia',
  pendidikan_pancasila: 'Pendidikan Pancasila',
}

const KESULITAN_LABELS: Record<string, string> = {
  mudah: 'Mudah',
  sedang: 'Sedang',
  sulit: 'Sulit',
  campuran: 'Campuran',
}

const REVIEW_MODE_LABELS: Record<string, string> = {
  fast: 'Cepat',
  slow: 'Detail',
}

function GeneratePage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [kelas, setKelas] = useState<string>('')
  const [mapel, setMapel] = useState<string>('bahasa_indonesia')
  const [topik, setTopik] = useState<string>('')
  const [kesulitan, setKesulitan] = useState<string>('campuran')
  const [reviewMode, setReviewMode] = useState<'fast' | 'slow'>('fast')
  const [contohSoal, setContohSoal] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      void navigate({ to: '/review', search: { mode: reviewMode } })
    }, 2000)
  }

  const topikOptions = mapel === 'bahasa_indonesia' ? TOPIK_BI : TOPIK_PPKN

  return (
    <div className='grid md:grid-cols-[1fr_340px] gap-8'>
      {/* Left column — Form */}
      <div className='space-y-6'>
        <PageHeader
          onBack={() => void navigate({ to: '/dashboard' })}
          title='Generate Lembar (AI)'
          subtitle='1 lembar = 20 soal pilihan ganda'
        />

        <FileUpload
          onFileSelect={(file) => setSelectedFile(file)}
          onFileRemove={() => setSelectedFile(null)}
          selectedFile={selectedFile}
        />

        {/* Form fields */}
        <div className='relative'>
          <div className='space-y-5'>
            {/* Kelas */}
            <div className='space-y-1.5'>
              <Label htmlFor='kelas'>Kelas</Label>
              <Select value={kelas} onValueChange={setKelas}>
                <SelectTrigger id='kelas'>
                  <SelectValue placeholder='Pilih kelas' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='5'>Kelas 5</SelectItem>
                  <SelectItem value='6'>Kelas 6</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kurikulum */}
            <div className='space-y-1.5'>
              <div className='flex items-center gap-1.5'>
                <Label htmlFor='kurikulum'>Kurikulum</Label>
                <Lock className='h-3.5 w-3.5 text-text-tertiary' />
              </div>
              <Select disabled defaultValue='merdeka'>
                <SelectTrigger id='kurikulum'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='merdeka'>Kurikulum Merdeka</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-caption text-text-tertiary mt-1'>Fase C (Kelas 5–6)</p>
            </div>

            {/* Mata Pelajaran */}
            <div className='space-y-1.5'>
              <Label htmlFor='mapel'>Mata Pelajaran</Label>
              <Select
                value={mapel}
                onValueChange={(v) => {
                  setMapel(v)
                  setTopik('')
                }}
              >
                <SelectTrigger id='mapel'>
                  <SelectValue placeholder='Pilih mata pelajaran' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='bahasa_indonesia'>Bahasa Indonesia</SelectItem>
                  <SelectItem value='pendidikan_pancasila'>Pendidikan Pancasila</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Topik */}
            <div className='space-y-1.5'>
              <Label htmlFor='topik'>Topik</Label>
              <Select value={topik} onValueChange={setTopik}>
                <SelectTrigger id='topik'>
                  <SelectValue placeholder='Pilih topik' />
                </SelectTrigger>
                <SelectContent key={mapel}>
                  {topikOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tingkat Kesulitan */}
            <div className='space-y-1.5'>
              <Label htmlFor='kesulitan'>Tingkat Kesulitan</Label>
              <Select value={kesulitan} onValueChange={setKesulitan}>
                <SelectTrigger id='kesulitan'>
                  <SelectValue placeholder='Pilih kesulitan' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='mudah'>Mudah</SelectItem>
                  <SelectItem value='sedang'>Sedang</SelectItem>
                  <SelectItem value='sulit'>Sulit</SelectItem>
                  <SelectItem value='campuran'>Campuran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mode Review */}
            <div className='space-y-1.5'>
              <Label>Mode Review</Label>
              <RadioGroup
                value={reviewMode}
                onValueChange={(v) => setReviewMode(v as 'fast' | 'slow')}
              >
                <div className='grid grid-cols-2 gap-3'>
                  <Label
                    htmlFor='mode-fast'
                    className={`flex flex-col gap-1 p-4 rounded-sm border cursor-pointer transition-colors ${reviewMode === 'fast' ? 'border-primary-600 bg-primary-50' : 'border-border-ui bg-bg-surface hover:bg-bg-muted'}`}
                  >
                    <RadioGroupItem value='fast' id='mode-fast' className='sr-only' />
                    <span className='text-body font-medium text-text-primary'>Cepat</span>
                    <span className='text-body-sm text-text-tertiary'>Auto-terima 20 soal</span>
                  </Label>
                  <Label
                    htmlFor='mode-slow'
                    className={`flex flex-col gap-1 p-4 rounded-sm border cursor-pointer transition-colors ${reviewMode === 'slow' ? 'border-primary-600 bg-primary-50' : 'border-border-ui bg-bg-surface hover:bg-bg-muted'}`}
                  >
                    <RadioGroupItem value='slow' id='mode-slow' className='sr-only' />
                    <span className='text-body font-medium text-text-primary'>Detail</span>
                    <span className='text-body-sm text-text-tertiary'>Review satu per satu</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Contoh Soal */}
            <div className='space-y-1.5'>
              <Label htmlFor='contoh-soal'>
                Contoh Soal <span className='text-text-tertiary font-normal'>(opsional)</span>
              </Label>
              <Textarea
                id='contoh-soal'
                placeholder='Paste contoh soal yang diinginkan gayanya...'
                rows={4}
                value={contohSoal}
                onChange={(e) => setContohSoal(e.target.value)}
              />
            </div>

            {/* CTA */}
            <Button
              className='w-full mt-2'
              disabled={!kelas || !mapel || !topik || !kesulitan || isGenerating}
              onClick={handleGenerate}
            >
              <Sparkles className='mr-2 h-4 w-4' />
              {isGenerating ? 'Sedang membuat 20 soal...' : 'Generate Lembar'}
            </Button>
          </div>

          {/* Loading overlay */}
          {isGenerating && (
            <div className='absolute inset-0 bg-bg-app/80 rounded-md flex items-center justify-center z-10'>
              <div className='text-center space-y-3'>
                <Skeleton className='h-4 w-48 mx-auto' />
                <p className='text-body-sm text-text-secondary'>
                  Sedang membuat 20 soal... (10–30 detik)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right column — Sidebar summary */}
      <div className='hidden md:block'>
        <Card className='sticky top-[72px]'>
          <CardContent className='p-6 space-y-4'>
            <h3 className='text-body font-semibold text-text-primary'>Ringkasan</h3>
            <div className='space-y-2 text-body-sm'>
              <div className='flex justify-between'>
                <span className='text-text-tertiary'>Kelas</span>
                <span className='text-text-primary'>{kelas ? `Kelas ${kelas}` : '—'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-text-tertiary'>Mata Pelajaran</span>
                <span className='text-text-primary'>
                  {mapel ? (SUBJECT_LABELS[mapel] ?? mapel) : '—'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-text-tertiary'>Topik</span>
                <span className='text-text-primary max-w-[160px] text-right'>
                  {topik || '—'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-text-tertiary'>Kesulitan</span>
                <span className='text-text-primary'>
                  {kesulitan ? (KESULITAN_LABELS[kesulitan] ?? kesulitan) : '—'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-text-tertiary'>Mode</span>
                <span className='text-text-primary'>
                  {REVIEW_MODE_LABELS[reviewMode] ?? reviewMode}
                </span>
              </div>
            </div>
            <Separator />
            <div className='flex justify-between text-body-sm'>
              <span className='text-text-tertiary'>Jumlah soal</span>
              <Badge variant='secondary'>20 soal</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
