import type { BankQuestion } from '@teacher-exam/shared'
import { MathText } from '../math-text.js'
import { QuestionMetaBadges } from '../shared/question-meta-badges.js'

interface BankQuestionCardProps {
  item: BankQuestion
  onSelect: (item: BankQuestion) => void
}

function BankQuestionCard({ item, onSelect }: BankQuestionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full rounded-md border border-border-default bg-bg-surface p-4 shadow-xs text-left transition-colors duration-[120ms] hover:bg-kertas-50 hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color:var(--color-border-focus)]/40"
      aria-label={`Pratinjau soal: ${item.text.slice(0, 80)}`}
    >
      <div className="mb-3">
        <QuestionMetaBadges
          subject={item.subject}
          grade={item.grade}
          difficulty={item.difficulty}
          isPublic={item.isPublic}
          topics={item.topics}
          showTopicChip
        />
      </div>
      <p className="text-body-sm text-text-primary leading-relaxed line-clamp-4">
        <MathText text={item.text} />
      </p>
      {item.topics.length > 0 ? (
        <p className="mt-3 text-caption text-text-tertiary">
          Topik: {item.topics.join(', ')}
        </p>
      ) : null}
    </button>
  )
}

export { BankQuestionCard }
