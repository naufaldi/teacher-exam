import type { BankQuestion, PublicBankQuestion } from '@teacher-exam/shared'
import { MathText } from '../math-text.js'
import { QuestionMetaBadges } from '../shared/question-meta-badges.js'

type BankCardItem = BankQuestion | PublicBankQuestion

function isOwnBankQuestion(item: BankCardItem): item is BankQuestion {
  return 'userId' in item
}

interface BankQuestionCardProps {
  item: BankCardItem
  authorName?: string
  selected?: boolean
  selectable?: boolean
  showUsageByOthers?: boolean
  onSelect: (item: BankCardItem) => void
  onToggleSelect?: (item: BankCardItem) => void
}

function BankQuestionCard({
  item,
  authorName,
  selected = false,
  selectable = false,
  showUsageByOthers = false,
  onSelect,
  onToggleSelect,
}: BankQuestionCardProps) {
  const isPublic = isOwnBankQuestion(item) ? item.isPublic : true
  const usageCount = item.usageCount

  return (
    <div className="rounded-md border border-border-default bg-bg-surface p-4 shadow-xs transition-colors duration-[120ms] hover:bg-kertas-50 hover:border-border-strong">
      <div className="flex gap-3">
        {selectable ? (
          <div className="pt-1">
            <input
              type="checkbox"
              checked={selected}
              aria-label={`Pilih soal: ${item.text.slice(0, 60)}`}
              onChange={() => onToggleSelect?.(item)}
              className="h-4 w-4 rounded border-border-default"
            />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="flex-1 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color:var(--color-border-focus)]/40 rounded-sm"
          aria-label={`Pratinjau soal: ${item.text.slice(0, 80)}`}
        >
          <div className="mb-3">
            <QuestionMetaBadges
              subject={item.subject}
              grade={item.grade}
              difficulty={item.difficulty}
              isPublic={isPublic}
              topics={item.topics}
              showTopicChip
            />
          </div>
          {authorName ? (
            <p className="text-caption text-text-tertiary mb-2">Oleh {authorName}</p>
          ) : null}
          <p className="text-body-sm text-text-primary leading-relaxed line-clamp-4">
            <MathText text={item.text} />
          </p>
          {item.topics.length > 0 ? (
            <p className="mt-3 text-caption text-text-tertiary">
              Topik: {item.topics.join(', ')}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
            {usageCount > 0 ? (
              <span>
                {showUsageByOthers
                  ? `Dipakai ${usageCount} guru lain`
                  : `Digunakan ${usageCount}×`}
              </span>
            ) : null}
            {isOwnBankQuestion(item) && !item.isPublic ? (
              <span>Bagikan ujian di Riwayat untuk publikasikan</span>
            ) : null}
          </div>
        </button>
      </div>
    </div>
  )
}

export { BankQuestionCard }
export type { BankCardItem }
