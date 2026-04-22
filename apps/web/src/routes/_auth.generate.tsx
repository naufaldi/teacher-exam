import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Sparkles, Lock, ArrowLeft, AlertTriangle, FileText, X } from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  FileUpload,
  Input,
  Label,
  Progress,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Separator,
  Textarea,
  RadioGroup,
  RadioGroupItem,
} from '@teacher-exam/ui'

export const Route = createFileRoute('/_auth/generate')({
  component: GeneratePage,
})

// ── Topic lists from PRD section 8.3 ─────────────────────────────────────────

const TOPIK_BI = [
  'Pemahaman Bacaan',
  'Ide Pokok dan Gagasan Pendukung',
  'Unsur Intrinsik Cerita (Tokoh, Latar, Alur, Amanat)',
  'Teks Narasi',
  'Teks Eksplanasi',
  'Teks Deskripsi',
  'Teks Eksposisi',
  'Teks Persuasi',
  'Kosakata (Denotatif, Konotatif, Kiasan)',
  'Gaya Bahasa (Majas)',
  'Kalimat Langsung dan Tidak Langsung',
  'Kalimat Majemuk',
  'Tanda Baca dan Ejaan',
  'Puisi',
  'Cerpen dan Fabel',
  'Dongeng dan Legenda',
  'Surat Resmi dan Surat Pribadi',
  'Iklan',
  'Opini dan Fakta',
  'Ringkasan dan Kesimpulan',
] as const

const TOPIK_PPKN = [
  'Hubungan Antar-Sila dalam Pancasila',
  'Nilai-Nilai Pancasila sebagai Pandangan Hidup',
  'Penerapan Nilai Pancasila di Kehidupan Sehari-hari',
  'Pengamalan Pancasila di Lingkungan Keluarga, Sekolah, Masyarakat',
  'Norma dalam Kehidupan Bermasyarakat',
  'Hak dan Kewajiban Warga Negara',
  'Hak dan Kewajiban Anak',
  'Keberagaman Budaya Indonesia',
  'Keberagaman Agama dan Toleransi',
  'Menghormati Perbedaan',
  'Provinsi di Indonesia dan Wilayah NKRI',
  'Persatuan dan Kesatuan Bangsa',
  'Gotong Royong',
  'Musyawarah dan Pengambilan Keputusan',
] as const

// ── Loading step labels ───────────────────────────────────────────────────────

const GENERATE_STEPS = [
  'Menganalisis materi dan topik...',
  'Membuat 20 soal pilihan ganda...',
  'Menyusun kunci jawaban...',
  'Melakukan validasi akhir...',
] as const

// ── Display label maps ────────────────────────────────────────────────────────

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

// ── Section header helper ─────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary whitespace-nowrap">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function GeneratePage() {
  const navigate = useNavigate()

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [kelas, setKelas] = useState<string>('')
  const [mapel, setMapel] = useState<string>('bahasa_indonesia')
  const [topik, setTopik] = useState<string>('')
  const [customTopik, setCustomTopik] = useState<string>('')
  const [kesulitan, setKesulitan] = useState<string>('campuran')
  const [reviewMode, setReviewMode] = useState<'fast' | 'slow'>('fast')
  const [contohSoal, setContohSoal] = useState<string>('')

  // Loading / error state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Progress interval ref for cleanup
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Drive progress bar and step labels while generating
  useEffect(() => {
    if (!isGenerating) return

    setProgress(0)
    setProgressStep(0)

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 4) + 2
        const capped = Math.min(next, 90)
        // Update step based on progress thresholds
        if (capped >= 75) setProgressStep(3)
        else if (capped >= 50) setProgressStep(2)
        else if (capped >= 20) setProgressStep(1)
        else setProgressStep(0)
        return capped
      })
    }, 300)

    return () => {
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [isGenerating])

  const topikOptions = mapel === 'bahasa_indonesia' ? TOPIK_BI : TOPIK_PPKN

  // Effective topic value for submission
  const effectiveTopik = topik === '__custom' ? customTopik : topik

  // Sidebar completion count
  const filledCount = [kelas, mapel, effectiveTopik, kesulitan].filter(Boolean).length

  const handleGenerate = () => {
    setError(null)
    setIsGenerating(true)
    // Stub: simulate 2s AI call then navigate
    setTimeout(() => {
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setProgress(100)
      setTimeout(() => {
        setIsGenerating(false)
        void navigate({ to: '/review', search: { mode: reviewMode } })
      }, 400)
    }, 2000)
  }

  const isFormValid = Boolean(kelas && mapel && effectiveTopik && kesulitan && !isGenerating)

  return (
    <div className="grid md:grid-cols-[1fr_340px] gap-8">

      {/* ── Left column: Hero + Form ────────────────────────────────────── */}
      <div className="space-y-6">

        {/* ── Hero section ── */}
        <section
          className="animate-fade-up-stagger"
          style={{ '--index': 0 } as React.CSSProperties}
        >
          <div className="relative overflow-hidden rounded-lg border border-border-default bg-white p-7">
            {/* Subtle red radial wash */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 1200px 360px at -10% -40%, rgba(180,35,24,0.07), transparent 60%)',
              }}
            />

            <div className="relative">
              {/* Back button */}
              <button
                onClick={() => void navigate({ to: '/dashboard' })}
                className="flex items-center gap-1.5 mb-4 text-body-sm text-text-tertiary hover:text-text-primary transition-colors duration-[120ms]"
              >
                <ArrowLeft size={15} />
                Kembali ke Dashboard
              </button>

              {/* Icon + title row */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-[12px] bg-primary-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h1 className="text-h1 font-bold text-text-primary leading-tight">
                    Generate Lembar (AI)
                  </h1>
                  <p className="text-body text-text-tertiary mt-0.5">
                    1 lembar = 20 soal pilihan ganda
                  </p>
                </div>
              </div>

              {/* Reactive badge chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="pill">
                  <Lock size={11} />
                  Kurikulum Merdeka · Fase C
                </Badge>
                {mapel === 'bahasa_indonesia' ? (
                  <Badge variant="subject-bi">Bahasa Indonesia</Badge>
                ) : (
                  <Badge variant="subject-ppkn">Pendidikan Pancasila</Badge>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Form sections ── */}
        <div className="relative space-y-8">

          {/* Section A: Materi Ujian */}
          <section
            className="animate-fade-up-stagger space-y-5"
            style={{ '--index': 1 } as React.CSSProperties}
          >
            <SectionHeader label="Materi Ujian" />

            {/* File upload */}
            <FileUpload
              onFileSelect={(file) => setSelectedFile(file)}
              onFileRemove={() => setSelectedFile(null)}
              selectedFile={selectedFile}
            />

            {/* Kelas */}
            <div className="space-y-1.5">
              <Label htmlFor="kelas">Kelas</Label>
              <Select value={kelas} onValueChange={setKelas}>
                <SelectTrigger id="kelas">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Kelas 5 SD</SelectItem>
                  <SelectItem value="6">Kelas 6 SD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kurikulum (locked) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="kurikulum">Kurikulum</Label>
                <Lock className="h-3.5 w-3.5 text-text-tertiary" />
              </div>
              <Select disabled defaultValue="merdeka">
                <SelectTrigger id="kurikulum">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merdeka">Kurikulum Merdeka</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-caption text-text-tertiary mt-1">Fase C (Kelas 5–6)</p>
            </div>

            {/* Mata Pelajaran */}
            <div className="space-y-1.5">
              <Label htmlFor="mapel">Mata Pelajaran</Label>
              <Select
                value={mapel}
                onValueChange={(v) => {
                  setMapel(v)
                  setTopik('')
                  setCustomTopik('')
                }}
              >
                <SelectTrigger id="mapel">
                  <SelectValue placeholder="Pilih mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bahasa_indonesia">Bahasa Indonesia</SelectItem>
                  <SelectItem value="pendidikan_pancasila">Pendidikan Pancasila</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Topik */}
            <div className="space-y-1.5">
              <Label htmlFor="topik">Topik</Label>
              <Select value={topik} onValueChange={setTopik}>
                <SelectTrigger id="topik">
                  <SelectValue placeholder="Pilih topik" />
                </SelectTrigger>
                <SelectContent key={mapel}>
                  {topikOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom">Lainnya (ketik sendiri)...</SelectItem>
                </SelectContent>
              </Select>
              {topik === '__custom' ? (
                <Input
                  id="topik-custom"
                  placeholder="Ketik topik Anda..."
                  value={customTopik}
                  onChange={(e) => setCustomTopik(e.target.value)}
                  className="mt-2"
                />
              ) : null}
            </div>
          </section>

          {/* Section B: Pengaturan Soal */}
          <section
            className="animate-fade-up-stagger space-y-5"
            style={{ '--index': 2 } as React.CSSProperties}
          >
            <SectionHeader label="Pengaturan Soal" />

            {/* Tingkat Kesulitan */}
            <div className="space-y-1.5">
              <Label htmlFor="kesulitan">Tingkat Kesulitan</Label>
              <Select value={kesulitan} onValueChange={setKesulitan}>
                <SelectTrigger id="kesulitan">
                  <SelectValue placeholder="Pilih kesulitan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mudah">Mudah</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="sulit">Sulit</SelectItem>
                  <SelectItem value="campuran">Campuran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Jumlah Soal (fixed info — PRD US-8) */}
            <div className="flex items-center justify-between p-3 rounded-sm bg-bg-muted border border-border-default">
              <Label className="text-body text-text-secondary cursor-default">Jumlah Soal</Label>
              <Badge variant="secondary">20 soal</Badge>
            </div>

            {/* Mode Review */}
            <div className="space-y-1.5">
              <Label>Mode Review</Label>
              <RadioGroup
                value={reviewMode}
                onValueChange={(v) => setReviewMode(v as 'fast' | 'slow')}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Label
                    htmlFor="mode-fast"
                    className={[
                      'flex flex-col gap-1 p-4 rounded-sm border cursor-pointer',
                      'transition-all duration-[180ms]',
                      reviewMode === 'fast'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-border-ui bg-bg-surface hover:bg-bg-muted hover:-translate-y-0.5 hover:shadow-md',
                    ].join(' ')}
                  >
                    <RadioGroupItem value="fast" id="mode-fast" className="sr-only" />
                    <span className="text-body font-medium text-text-primary">Cepat</span>
                    <span className="text-body-sm text-text-tertiary">Auto-terima 20 soal</span>
                  </Label>
                  <Label
                    htmlFor="mode-slow"
                    className={[
                      'flex flex-col gap-1 p-4 rounded-sm border cursor-pointer',
                      'transition-all duration-[180ms]',
                      reviewMode === 'slow'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-border-ui bg-bg-surface hover:bg-bg-muted hover:-translate-y-0.5 hover:shadow-md',
                    ].join(' ')}
                  >
                    <RadioGroupItem value="slow" id="mode-slow" className="sr-only" />
                    <span className="text-body font-medium text-text-primary">Detail</span>
                    <span className="text-body-sm text-text-tertiary">Review satu per satu</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </section>

          {/* Section C: Referensi (Opsional) */}
          <section
            className="animate-fade-up-stagger space-y-5"
            style={{ '--index': 3 } as React.CSSProperties}
          >
            <SectionHeader label="Referensi (Opsional)" />

            <div className="space-y-1.5">
              <Label htmlFor="contoh-soal">
                Contoh Soal{' '}
                <span className="text-text-tertiary font-normal">(opsional)</span>
              </Label>
              <Textarea
                id="contoh-soal"
                placeholder="Paste contoh soal yang diinginkan gayanya..."
                rows={4}
                value={contohSoal}
                onChange={(e) => setContohSoal(e.target.value)}
              />
            </div>
          </section>

          {/* CTA area */}
          <section
            className="animate-fade-up-stagger pt-2"
            style={{ '--index': 4 } as React.CSSProperties}
          >
            {/* Error alert */}
            {error !== null ? (
              <div className="flex items-start gap-3 p-3 rounded-sm bg-danger-bg border border-danger-border mb-4">
                <AlertTriangle size={16} className="text-danger-fg shrink-0 mt-0.5" />
                <p className="flex-1 text-body-sm text-danger-fg font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="shrink-0 text-danger-fg hover:text-text-primary transition-colors duration-[120ms]"
                  aria-label="Tutup pesan error"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            <div className="pt-4 border-t border-border-default">
              <Button
                size="lg"
                className="w-full"
                disabled={!isFormValid}
                onClick={handleGenerate}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Lembar
              </Button>
              <p className="text-caption text-text-tertiary text-center mt-2">
                AI akan membuat 20 soal sesuai Capaian Pembelajaran Fase C
              </p>
            </div>
          </section>

          {/* ── Loading overlay ── */}
          {isGenerating ? (
            <div className="absolute inset-0 bg-bg-app/90 backdrop-blur-[2px] rounded-md flex items-center justify-center z-10">
              <div className="text-center space-y-4 max-w-xs w-full px-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
                  <Sparkles size={22} className="text-primary-600 animate-pulse" />
                </div>
                <Progress value={progress} className="h-2" />
                <div className="space-y-1">
                  <p className="text-body font-medium text-text-primary">
                    {GENERATE_STEPS[progressStep]}
                  </p>
                  <p className="text-caption text-text-tertiary">Estimasi 10–30 detik</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Right column: Sticky sidebar summary ────────────────────────── */}
      <div
        className="hidden md:block animate-fade-up-stagger"
        style={{ '--index': 5 } as React.CSSProperties}
      >
        <Card className="sticky top-[72px]">
          <CardContent className="p-6 space-y-4">

            {/* Header + completion indicator */}
            <div className="space-y-2">
              <h3 className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
                Ringkasan Konfigurasi
              </h3>
              <div className="flex items-center gap-2">
                <Progress value={filledCount * 25} className="h-1.5 flex-1" />
                <span className="text-caption text-text-tertiary tabular-nums">
                  {filledCount}/4
                </span>
              </div>
            </div>

            <Separator />

            {/* Summary rows */}
            <div className="space-y-2.5 text-body-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Kelas</span>
                <span className="text-text-primary text-right">
                  {kelas ? `Kelas ${kelas} SD` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Mata Pelajaran</span>
                <span className="text-right">
                  {mapel === 'bahasa_indonesia' ? (
                    <Badge variant="subject-bi" className="text-caption">
                      Bahasa Indonesia
                    </Badge>
                  ) : mapel === 'pendidikan_pancasila' ? (
                    <Badge variant="subject-ppkn" className="text-caption">
                      Pend. Pancasila
                    </Badge>
                  ) : (
                    <span className="text-text-primary">—</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-start gap-2">
                <span className="text-text-tertiary shrink-0">Topik</span>
                <span className="text-text-primary max-w-[160px] text-right">
                  {topik === '__custom'
                    ? (customTopik || '—')
                    : (topik || '—')}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Kesulitan</span>
                <span className="text-text-primary">
                  {kesulitan ? (KESULITAN_LABELS[kesulitan] ?? kesulitan) : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-text-tertiary shrink-0">Mode</span>
                <span className="text-text-primary">
                  {REVIEW_MODE_LABELS[reviewMode] ?? reviewMode}
                </span>
              </div>
            </div>

            <Separator />

            {/* Fixed info row */}
            <div className="flex justify-between items-center text-body-sm">
              <span className="text-text-tertiary">Jumlah soal</span>
              <Badge variant="secondary">20 soal</Badge>
            </div>

            {/* File indicator */}
            {selectedFile !== null ? (
              <div className="flex items-center gap-2 text-body-sm pt-1 border-t border-border-default">
                <FileText size={14} className="text-text-tertiary shrink-0" />
                <span className="text-text-secondary truncate">{selectedFile.name}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
