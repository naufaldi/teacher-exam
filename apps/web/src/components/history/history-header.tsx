import { CalendarDays, FolderOpen } from 'lucide-react'

interface SummaryItem {
  label: string
  value: number | string
  hint?: string
}

interface HistoryHeaderProps {
  total: number
  finalCount: number
  draftCount: number
  thisMonthCount: number
}

function formatTodayLong(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function HistoryHeader({
  total,
  finalCount,
  draftCount,
  thisMonthCount,
}: HistoryHeaderProps) {
  const summary: readonly SummaryItem[] = [
    { label: 'Total lembar', value: total },
    { label: 'Sudah final', value: finalCount },
    { label: 'Masih draft', value: draftCount },
    { label: 'Bulan ini', value: thisMonthCount, hint: 'April 2026' },
  ]

  return (
    <div className="relative overflow-hidden rounded-lg border border-border-default bg-white p-7">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 1100px 320px at -10% -40%, rgba(180,35,24,0.06), transparent 60%)',
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        <div>
          <div className="flex items-center gap-2 text-caption font-semibold tracking-wider uppercase text-primary-700">
            <FolderOpen size={13} />
            Riwayat Ujian · Tahun 2025/2026
          </div>

          <h1 className="text-h1 font-bold text-text-primary mt-2 mb-1.5">
            Semua lembar ujian Anda
          </h1>

          <p className="text-body text-text-secondary max-w-[58ch]">
            Cetak ulang, duplikat menjadi draft baru, atau buka koreksi cepat.
            Lembar yang masih draft tetap bisa Anda lanjutkan kapan saja.
          </p>

          <div className="mt-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-kertas-100 border border-border-default text-caption text-text-secondary">
            <CalendarDays size={11} />
            {formatTodayLong()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-border-default bg-bg-surface px-4 py-3"
            >
              <div className="text-caption font-semibold tracking-wider uppercase text-text-tertiary">
                {item.label}
              </div>
              <div className="mt-1 text-[28px] font-bold leading-none text-text-primary tabular-nums">
                {item.value}
              </div>
              {item.hint ? (
                <div className="mt-1 text-caption text-text-tertiary">{item.hint}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { HistoryHeader }
