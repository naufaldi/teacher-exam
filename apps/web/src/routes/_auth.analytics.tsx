import { createFileRoute, Link } from "@tanstack/react-router"
import type { ExamAnalyticsResponse, ScoreBand } from "@teacher-exam/shared"
import {
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@teacher-exam/ui"
import { Either, Schema } from "effect"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { useEffect, useState } from "react"
import { ComingSoonPage } from "../components/coming-soon-page.js"
import { ExportMenu } from "../components/export-menu.js"
import { api } from "../lib/api.js"
import { DELIVERY_ENABLED } from "../lib/feature-flags.js"

const AnalyticsSearchSchema = Schema.Struct({
  examId: Schema.optional(Schema.String)
})

export const Route = createFileRoute("/_auth/analytics")({
  component: AnalyticsPage,
  validateSearch: (search) => Schema.decodeUnknownSync(AnalyticsSearchSchema)(search) as Record<string, unknown>
})

function AnalyticsPage() {
  return (
    <ComingSoonPage
      title="Analitik"
      subtitle="Lihat performa siswa dan distribusi nilai per ujian."
      icon={<BarChart3 size={24} className="text-text-tertiary" />}
    />
  )
}

function _AnalyticsPageImpl() {
  const examId = Route.useSearch({
    select: (s) => s["examId"] as string | undefined
  })
  const [analytics, setAnalytics] = useState<ExamAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!DELIVERY_ENABLED || !examId) {
      setLoading(false)
      return
    }
    void loadAnalytics(examId)
  }, [examId])

  async function loadAnalytics(id: string) {
    setLoading(true)
    setError(null)
    const result = await api.analytics.getByExam(id)
    if (Either.isRight(result)) {
      setAnalytics(result.right)
    } else {
      setError("Gagal memuat analitik")
    }
    setLoading(false)
  }

  if (!DELIVERY_ENABLED) {
    return (
      <EmptyState
        title="Analitik belum tersedia"
        description="Fitur analitik sedang dalam pengembangan."
        className="py-16"
      />
    )
  }

  if (!examId) {
    return (
      <EmptyState
        title="Pilih ujian untuk melihat analitik"
        description="Buka analitik dari kartu ujian di dashboard atau riwayat."
        className="py-16"
      />
    )
  }

  if (loading) {
    return <LoadingSpinner message="Memuat analitik..." />
  }

  if (error || !analytics) {
    return (
      <EmptyState
        title={error ?? "Analitik tidak tersedia"}
        description="Coba muat ulang halaman atau pilih ujian lain."
        className="py-16"
      />
    )
  }

  if (analytics.participantCount === 0) {
    return (
      <div className="space-y-4">
        <AnalyticsHeader examId={examId} title={analytics.examTitle} />
        <EmptyState
          title="Belum ada peserta"
          description="Analitik akan muncul setelah siswa menyelesaikan ujian pada sesi yang ditutup."
          className="py-16"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader examId={examId} title={analytics.examTitle} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Peserta" value={String(analytics.participantCount)} />
        <StatCard label="Nilai rata-rata" value={String(analytics.averageScore)} />
        <StatCard label="Tingkat penyelesaian" value={`${analytics.completionRate}%`} />
      </div>

      <ScoreDistributionChart bands={analytics.scoreDistribution} />

      <PerQuestionTable analytics={analytics} />

      <div className="pt-2">
        <ExportMenu
          triggerLabel="Unduh Rekap"
          onExport={(format) => {
            void api.exams.export(examId, format, "kunci")
          }}
          onPrint={() => window.print()}
        />
      </div>
    </div>
  )
}

function AnalyticsHeader({ examId, title }: { examId: string; title: string }) {
  return (
    <div className="space-y-2">
      <Link
        to="/history"
        className="inline-flex items-center gap-1 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Riwayat
      </Link>
      <PageHeader
        title={`Analitik · ${title}`}
        subtitle={`Ujian ${examId}`}
      >
        <BarChart3 className="h-5 w-5 text-primary-600" />
      </PageHeader>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border-ui bg-bg-surface p-4 space-y-1">
      <p className="text-caption text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className="text-h2 font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

function ScoreDistributionChart({ bands }: { bands: ReadonlyArray<ScoreBand> }) {
  const max = Math.max(...bands.map((b) => b.count), 1)
  return (
    <div className="rounded-sm border border-border-ui bg-bg-surface p-4 space-y-3">
      <h2 className="text-body font-semibold text-text-primary">Distribusi Nilai</h2>
      <div className="flex items-end gap-3 h-32">
        {bands.map((band) => {
          const heightPct = Math.max((band.count / max) * 100, 4)
          return (
            <div key={band.range} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-caption text-text-tertiary tabular-nums">{band.count}</span>
              <div className="relative w-full h-full rounded-xs bg-kertas-100">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-xs bg-primary-600 transition-all duration-[180ms]"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-caption text-text-tertiary">{band.range}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PerQuestionTable({ analytics }: { analytics: ExamAnalyticsResponse }) {
  return (
    <div className="rounded-sm border border-border-ui bg-bg-surface overflow-hidden">
      <div className="p-4 border-b border-border-ui">
        <h2 className="text-body font-semibold text-text-primary">Tingkat Ketepatan per Soal</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-3 text-xs">No</TableHead>
            <TableHead className="text-xs">Tipe</TableHead>
            <TableHead className="text-xs text-center">Terjawab</TableHead>
            <TableHead className="text-xs text-center">Benar (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {analytics.perQuestion.map((q) => (
            <TableRow key={q.questionId}>
              <TableCell className="px-3 py-2 text-body-sm text-text-tertiary tabular-nums">
                {q.number}
              </TableCell>
              <TableCell className="py-2 text-body-sm text-text-secondary">{q.type}</TableCell>
              <TableCell className="py-2 text-center text-body-sm text-text-secondary tabular-nums">
                {q.answeredCount}
              </TableCell>
              <TableCell className="py-2 text-center text-body-sm font-semibold text-text-primary tabular-nums">
                {q.correctRate}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
