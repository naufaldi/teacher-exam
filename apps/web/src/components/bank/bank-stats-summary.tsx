import type { BankQuestion, ExamSubject, PublicBankQuestion } from '@teacher-exam/shared'
import { SUBJECT_LABEL } from '@teacher-exam/shared'
import { Badge } from '@teacher-exam/ui'

interface BankStatsSummaryProps {
  items: readonly BankQuestion[]
}

function BankStatsSummary({ items }: BankStatsSummaryProps) {
  if (items.length === 0) return null

  const totals = new Map<ExamSubject, number>()
  for (const item of items) {
    totals.set(item.subject, (totals.get(item.subject) ?? 0) + 1)
  }

  const parts = [...totals.entries()].map(
    ([subject, count]) => `${count} ${SUBJECT_LABEL[subject] ?? subject}`,
  )

  return (
    <div className="rounded-md border border-border-default bg-kertas-50 px-4 py-3">
      <p className="text-body-sm text-text-secondary">
        <span className="font-semibold text-text-primary">{items.length}</span> soal tersimpan
        {parts.length > 0 ? (
          <>
            {' '}
            — {parts.join(', ')}
          </>
        ) : null}
      </p>
    </div>
  )
}

export { BankStatsSummary }
