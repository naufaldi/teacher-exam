import type { BankSheet } from "@teacher-exam/shared"
import { resolveExamSubjectLabel } from "@teacher-exam/shared"

interface BankStatsSummaryProps {
  items: ReadonlyArray<BankSheet>
}

function BankStatsSummary({ items }: BankStatsSummaryProps) {
  if (items.length === 0) return null

  const totals = new Map<string, number>()
  for (const item of items) {
    const label = resolveExamSubjectLabel({
      subject: item.subject,
      subjectLabel: item.subjectLabel
    })
    totals.set(label, (totals.get(label) ?? 0) + 1)
  }

  const parts = [...totals.entries()].map(([label, count]) => `${count} ${label}`)

  return (
    <div className="rounded-md border border-border-default bg-kertas-50 px-4 py-3">
      <p className="text-body-sm text-text-secondary">
        <span className="font-semibold text-text-primary">{items.length}</span> lembar tersimpan
        {parts.length > 0 ?
          (
            <>
              {" "}
              — {parts.join(", ")}
            </>
          ) :
          null}
      </p>
    </div>
  )
}

export { BankStatsSummary }
