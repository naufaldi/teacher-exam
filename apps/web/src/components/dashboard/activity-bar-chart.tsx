import type { ReactNode } from "react"

interface BarData {
  day: string
  count: number
  variant?: "default" | "secondary"
}

interface ActivityBarChartProps {
  data: ReadonlyArray<BarData>
  emptyHint?: ReactNode
  totalLabel?: ReactNode
}

function ActivityBarChart({ data, emptyHint, totalLabel }: ActivityBarChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div>
      <div className="flex items-baseline justify-between text-caption text-text-tertiary mb-2.5">
        <span>
          Aktivitas <span className="font-semibold text-text-secondary">7 hari terakhir (lembar disentuh)</span>
        </span>
        {totalLabel ? <span>{totalLabel}</span> : null}
      </div>
      <div className="flex items-end gap-1.5 h-12">
        {data.map((bar, i) => {
          const heightPct = Math.max((bar.count / max) * 100, 6)
          const isSecondary = bar.variant === "secondary"
          return (
            <div key={i} className="relative flex-1 h-full rounded-xs bg-kertas-100">
              <div
                className={`absolute inset-x-0 bottom-0 rounded-xs transition-all duration-[180ms] ${
                  isSecondary ? "bg-secondary-700" : "bg-primary-600"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((bar, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10px] tracking-wider uppercase text-text-tertiary"
          >
            {bar.day}
          </span>
        ))}
      </div>
      {emptyHint ? <p className="mt-2 text-caption text-text-tertiary m-0">{emptyHint}</p> : null}
    </div>
  )
}

export { ActivityBarChart }
