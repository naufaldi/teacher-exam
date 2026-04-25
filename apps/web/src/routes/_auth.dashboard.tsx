import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  Sparkles,
  FolderOpen,
  CheckSquare,
  ArrowRight,
  PrinterIcon,
  Copy,
  CalendarDays,
  Pencil,
} from 'lucide-react'
import { useMemo } from 'react'
import { Button, Badge } from '@teacher-exam/ui'
import { api } from '../lib/api.js'
import { computeStats, computeWeeklyActivity, getRecentSheets } from '../lib/dashboard-selectors.js'
import { StatSummary } from '../components/dashboard/stat-summary.js'
import { MiniPaperPreview } from '../components/dashboard/mini-paper-preview.js'
import { CurriculumTipsCard } from '../components/dashboard/curriculum-tips-card.js'
import { ExamHistoryRow } from '../components/dashboard/exam-history-row.js'
import { DuplicateConfirmDialog } from '../components/dashboard/duplicate-confirm-dialog.js'
import { useDuplicateExam } from '../hooks/use-duplicate-exam.js'
import { KOREKSI_DISABLED_TITLE, KOREKSI_ENABLED } from '../lib/feature-flags.js'

export const Route = createFileRoute('/_auth/dashboard')({
  loader: async () => ({ exams: await api.exams.list() }),
  pendingComponent: DashboardSkeleton,
  errorComponent: DashboardError,
  component: DashboardPage,
})

// ── Module-level helpers (hoisted to avoid recreation on each render) ─────────

function getGreetingTime(): string {
  const h = new Date().getHours()
  if (h < 11) return 'pagi'
  if (h < 15) return 'siang'
  if (h < 18) return 'sore'
  return 'malam'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTodayLong(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ── Action card data (static, hoisted) ───────────────────────────────────────

const ACTION_CARDS = [
  {
    id: 'generate',
    to: '/generate' as const,
    variant: 'primary' as const,
    iconBg: 'bg-primary-600',
    iconColor: 'text-white',
    ctaColor: 'text-primary-700',
    icon: Sparkles,
    title: 'Generate Lembar (AI)',
    description:
      'Satu paket soal pilihan ganda selaras Capaian Pembelajaran Fase C. Bahasa Indonesia atau Pendidikan Pancasila — 10 sampai 30 detik.',
    cta: 'Mulai generate',
    kbd: 'G',
    cardBg: 'bg-gradient-to-b from-white to-primary-50 border-primary-100',
    disabled: false,
  },
  {
    id: 'history',
    to: '/history' as const,
    variant: 'secondary' as const,
    iconBg: 'bg-secondary-50',
    iconColor: 'text-secondary-700',
    ctaColor: 'text-secondary-700',
    icon: FolderOpen,
    title: 'Riwayat Ujian',
    description:
      'Lihat lembar tersimpan. Cetak ulang, duplikat, atau buka koreksi cepat untuk ujian yang sudah final.',
    cta: 'Buka riwayat',
    kbd: null,
    cardBg: 'bg-bg-surface border-border-default',
    disabled: false,
  },
  {
    id: 'review',
    to: '/dashboard' as const,
    variant: 'accent' as const,
    iconBg: 'bg-accent-50',
    iconColor: 'text-accent-700',
    ctaColor: 'text-accent-700',
    icon: CheckSquare,
    title: 'Koreksi Cepat',
    description:
      'Input jawaban murid, skor dihitung otomatis terhadap kunci. Rekap kelas per sesi siap dicetak.',
    cta: 'Mulai koreksi',
    kbd: null,
    cardBg: 'bg-bg-surface border-border-default',
    disabled: true,
  },
] as const

function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="h-52 rounded-lg bg-kertas-100" />
        <div className="h-52 rounded-lg bg-kertas-100" />
      </div>
      <div className="h-10 w-60 rounded bg-kertas-100" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-48 rounded-md bg-kertas-100" />
        <div className="h-48 rounded-md bg-kertas-100" />
        <div className="h-48 rounded-md bg-kertas-100" />
      </div>
      <div className="h-64 rounded-md bg-kertas-100" />
      <div className="h-48 rounded-md bg-kertas-100" />
    </div>
  )
}

function DashboardError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <div className="py-20 text-center space-y-3">
      <p className="text-body text-danger-700">
        {error.message || 'Gagal memuat data dashboard'}
      </p>
      <Button variant="secondary" size="sm" onClick={() => void router.invalidate()}>
        Coba lagi
      </Button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { user } = Route.useRouteContext()
  const { exams } = Route.useLoaderData()
  const navigate = useNavigate()
  const duplicate = useDuplicateExam()

  const stats = useMemo(() => computeStats(exams), [exams])
  const weekly = useMemo(() => computeWeeklyActivity(exams, new Date()), [exams])
  const recent = useMemo(() => getRecentSheets(exams, 5), [exams])
  const lastExam = recent[0] ?? null

  const firstName = user.name.split(' ')[0] ?? user.name
  const greeting = getGreetingTime()

  return (
    <div className="space-y-10">

      {/* ── Section 1: Hero — Greeting + Stats ──────────────────────────── */}
      <section
        className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch animate-fade-up-stagger"
        style={{ '--index': 0 } as React.CSSProperties}
      >
        {/* Greeting card */}
        <div className="relative overflow-hidden rounded-lg border border-border-default bg-white p-7">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 1200px 360px at -10% -40%, rgba(180,35,24,0.07), transparent 60%)',
            }}
          />

          <div className="relative">
            <div className="text-caption font-semibold tracking-wider uppercase text-primary-700">
              Tahun Pelajaran 2025/2026 · Semester 2
            </div>

            <h1 className="text-h1 font-bold text-text-primary mt-2 mb-1.5">
              Selamat {greeting}, Bu {firstName}!
            </h1>

            <p className="text-body text-text-secondary max-w-[560px]">
              Siap menyiapkan lembar ujian hari ini? Kurikulum Merdeka Fase C sudah terpasang
              otomatis — Anda cukup pilih kelas, mata pelajaran, dan topik.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="pill">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-600 inline-block" />
                Kurikulum Merdeka · Fase C
              </Badge>
              <Badge variant="subject-bi">Bahasa Indonesia</Badge>
              <Badge variant="subject-ppkn">Pendidikan Pancasila</Badge>
              <Badge variant="pill">
                <CalendarDays size={11} />
                {formatTodayLong()}
              </Badge>
            </div>
          </div>

          <img
            src="/assets/kop-stamp.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-8 -right-8 w-44 opacity-[0.07] rotate-[-8deg]"
          />
        </div>

        {/* Stats card */}
        <StatSummary stats={stats} weeklyActivity={weekly} />
      </section>

      {/* ── Section 2: Primary Actions ──────────────────────────────────── */}
      <section
        className="animate-fade-up-stagger"
        style={{ '--index': 1 } as React.CSSProperties}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-h2 font-bold text-text-primary">Apa yang ingin Anda kerjakan?</h2>
          <span className="text-body-sm text-text-tertiary hidden sm:block">Tiga alur inti</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACTION_CARDS.map((card) => {
            const Icon = card.icon
            const cardContent = (
              <>
                {card.variant === 'primary' ? (
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 w-40 h-40"
                    style={{
                      background:
                        'radial-gradient(closest-side, rgba(180,35,24,0.10), transparent 70%)',
                    }}
                  />
                ) : null}

                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
                  >
                    <Icon size={22} />
                  </div>
                  {card.disabled ? (
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-kertas-100 text-text-tertiary border border-border-default">
                      Segera hadir
                    </span>
                  ) : null}
                </div>

                <h3 className="text-h3 font-semibold text-text-primary mb-1">
                  {card.title}
                  {card.kbd ? (
                    <kbd className="ml-2 font-mono text-[11px] px-1.5 py-0.5 bg-white border border-border-default rounded-xs text-text-secondary align-middle">
                      {card.kbd}
                    </kbd>
                  ) : null}
                </h3>

                <p className="text-body-sm text-text-secondary leading-relaxed m-0 max-w-[42ch]">
                  {card.description}
                </p>

                <span className={`mt-5 inline-flex items-center gap-1.5 text-body-sm font-semibold ${card.disabled ? 'text-text-tertiary' : card.ctaColor}`}>
                  {card.disabled ? 'Belum tersedia' : card.cta}
                  {card.disabled ? null : (
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-[180ms] group-hover:translate-x-1"
                    />
                  )}
                </span>
              </>
            )

            if (card.disabled) {
              return (
                <div
                  key={card.id}
                  className={`relative flex flex-col p-6 rounded-md border overflow-hidden opacity-60 cursor-not-allowed select-none ${card.cardBg}`}
                  aria-disabled="true"
                >
                  {cardContent}
                </div>
              )
            }

            return (
              <Link
                key={card.id}
                to={card.to}
                className={`group relative flex flex-col p-6 rounded-md border overflow-hidden cursor-pointer transition-all duration-[180ms] hover:-translate-y-0.5 hover:shadow-md hover:border-primary-200 ${card.cardBg}`}
              >
                {cardContent}
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Section 3: Last Sheet + Curriculum Tips ──────────────────────── */}
      <section
        className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 animate-fade-up-stagger"
        style={{ '--index': 2 } as React.CSSProperties}
      >
        {/* Last exam card */}
        <div className="bg-bg-surface border border-border-default rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-caption font-semibold tracking-wider uppercase text-text-tertiary m-0">
              Lembar Terakhir Dibuat
            </h3>
            <Link
              to="/history"
              className="text-body-sm font-medium text-primary-700 hover:underline"
            >
              Semua lembar →
            </Link>
          </div>

          {lastExam ? (
            <div className="flex gap-5 p-4 bg-kertas-50 border border-border-default rounded-sm">
              <div className="w-[140px] shrink-0 hidden sm:block">
                <MiniPaperPreview exam={lastExam} />
              </div>

              <div className="flex flex-col min-w-0">
                <h4 className="text-h3 font-bold text-text-primary m-0 mb-2 leading-snug">
                  {lastExam.title}
                </h4>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-text-secondary mb-3">
                  <span>
                    <span className="text-text-tertiary mr-1">Topik:</span>
                    {lastExam.topics.join(', ')}
                  </span>
                  <span>
                    <span className="text-text-tertiary mr-1">Dibuat:</span>
                    {formatDate(lastExam.createdAt)}
                  </span>
                  {lastExam.durationMinutes !== null ? (
                    <span>
                      <span className="text-text-tertiary mr-1">Durasi:</span>
                      {lastExam.durationMinutes} menit
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={lastExam.status === 'final' ? 'success' : 'warning'}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                    {lastExam.status === 'final' ? 'Final' : 'Draft'}
                  </Badge>
                  {lastExam.status === 'final' ? (
                    <Badge variant="secondary">Siap cetak</Badge>
                  ) : null}
                </div>

                <p className="text-body-sm text-text-secondary m-0 mt-3 leading-snug">
                  Semua soal siap. Lembar jawaban dan kunci jawaban tergabung dalam satu file cetak.
                </p>

                <div className="flex gap-2 flex-wrap mt-4">
                  {lastExam.status === 'final' ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => void navigate({ to: '/preview', search: { examId: lastExam.id } })}
                      >
                        <PrinterIcon size={13} />
                        Cetak lembar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!KOREKSI_ENABLED}
                        title={KOREKSI_ENABLED ? undefined : KOREKSI_DISABLED_TITLE}
                        onClick={() =>
                          void navigate({
                            to: '/correction/$examId',
                            params: { examId: lastExam.id },
                          })
                        }
                      >
                        <CheckSquare size={13} />
                        Koreksi
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        void navigate({
                          to: '/review',
                          search: { examId: lastExam.id, mode: lastExam.reviewMode },
                        })
                      }
                    >
                      <Pencil size={13} />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicate.openFor(lastExam)}
                  >
                    <Copy size={13} />
                    Duplikat
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-text-tertiary text-body-sm">
              Belum ada lembar ujian. Mulai generate lembar pertama Anda.
            </div>
          )}
        </div>

        {/* Curriculum tips */}
        <CurriculumTipsCard />
      </section>

      {/* ── Section 4: History Table ─────────────────────────────────────── */}
      <section
        className="animate-fade-up-stagger"
        style={{ '--index': 3 } as React.CSSProperties}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-h2 font-bold text-text-primary">Riwayat terbaru</h2>
          <span className="text-body-sm text-text-tertiary">
            {recent.length} dari {stats.totalSheets} · urut terbaru
          </span>
        </div>

        <div className="bg-bg-surface border border-border-default rounded-md overflow-hidden">
          {/* Table header */}
          <div className="grid items-center px-5 py-3 bg-kertas-50 border-b border-border-default grid-cols-[2.4fr_1fr_0.8fr] lg:grid-cols-[2.4fr_1fr_0.8fr_0.9fr_1.2fr]">
            <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
              Lembar
            </span>
            <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
              Mata Pelajaran
            </span>
            <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
              Tanggal
            </span>
            <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary hidden lg:block">
              Status
            </span>
            <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary hidden lg:block text-right">
              Aksi
            </span>
          </div>

          {/* Rows */}
          {recent.length > 0 ? (
            recent.map((exam) => (
              <ExamHistoryRow key={exam.id} exam={exam} onDuplicate={duplicate.openFor} />
            ))
          ) : (
            <div className="py-8 text-center text-text-tertiary text-body-sm">
              Belum ada riwayat ujian.
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-kertas-50 border-t border-border-default">
            <span className="text-body-sm text-text-tertiary">
              Tampilkan {recent.length} dari {stats.totalSheets} lembar
            </span>
            <Link
              to="/history"
              className="text-body-sm font-semibold text-primary-700 hover:underline"
            >
              Lihat semua riwayat →
            </Link>
          </div>
        </div>
      </section>

      {duplicate.confirmingExam && (
        <DuplicateConfirmDialog
          exam={duplicate.confirmingExam}
          open={true}
          onOpenChange={(open) => { if (!open) duplicate.close() }}
          onConfirm={() => { void duplicate.confirm() }}
          isPending={duplicate.isPending}
        />
      )}
    </div>
  )
}
