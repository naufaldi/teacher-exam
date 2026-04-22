import { ActivityBarChart } from './activity-bar-chart.js'

interface StatSummaryProps {
  stats: {
    totalSheets: number
    finalCount: number
    draftCount: number
  }
  weeklyActivity: readonly { day: string; count: number; variant?: 'default' | 'secondary' }[]
}

function StatSummary({ stats, weeklyActivity }: StatSummaryProps) {
  const totalWeekly = weeklyActivity.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-6 flex flex-col gap-3 h-full">
      <h3 className="text-caption font-semibold tracking-wider uppercase text-text-tertiary m-0">
        Ringkasan Aktivitas
      </h3>

      <div className="grid grid-cols-3 gap-2 items-end">
        <div>
          <div className="text-h1 font-bold leading-none tracking-tight text-text-primary">
            {stats.totalSheets}
          </div>
          <div className="mt-1.5 text-caption text-text-tertiary font-medium">Lembar tersimpan</div>
        </div>
        <div>
          <div className="text-h1 font-bold leading-none tracking-tight text-secondary-700">
            {stats.finalCount}
          </div>
          <div className="mt-1.5 text-caption text-text-tertiary font-medium">Sudah final</div>
        </div>
        <div>
          <div className="text-h1 font-bold leading-none tracking-tight text-primary-700">
            {stats.draftCount}
          </div>
          <div className="mt-1.5 text-caption text-text-tertiary font-medium">Masih draft</div>
        </div>
      </div>

      <div className="border-t border-border-default pt-4 mt-auto">
        <ActivityBarChart data={weeklyActivity} totalLabel={`${totalWeekly} lembar`} />
      </div>
    </div>
  )
}

export { StatSummary }
