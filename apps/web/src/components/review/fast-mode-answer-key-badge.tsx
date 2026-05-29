import type { Question } from "@teacher-exam/shared"
import { Tooltip, TooltipContent, TooltipTrigger } from "@teacher-exam/ui"
import { matchQuestion, questionCorrectLabel } from "../../lib/question-render.js"

function answerKeyTooltip(question: Question): string {
  return matchQuestion(question, {
    mcq_single: (q) => `Jawaban benar: pilihan ${q.correct.toUpperCase()}`,
    mcq_multi: (q) => {
      const labels = q.correct.map((l) => l.toUpperCase())
      if (labels.length <= 1) return `Jawaban benar: pilihan ${labels[0] ?? ""}`
      const last = labels.pop()
      return `Jawaban benar: pilihan ${labels.join(", ")} dan ${last ?? ""}`
    },
    true_false: () => "B = Benar, S = Salah per pernyataan"
  })
}

export interface FastModeAnswerKeyBadgeProps {
  question: Question
}

export function FastModeAnswerKeyBadge({ question }: FastModeAnswerKeyBadgeProps) {
  const label = questionCorrectLabel(question)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="font-mono text-caption bg-bg-muted px-1.5 py-0.5 rounded-xs shrink-0 cursor-default"
          data-testid="fast-mode-answer-key-badge"
          aria-label={`Kunci jawaban: ${label}`}
        >
          Kunci {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {answerKeyTooltip(question)}
      </TooltipContent>
    </Tooltip>
  )
}
