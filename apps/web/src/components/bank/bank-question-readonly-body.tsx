import type { BankQuestion } from "@teacher-exam/shared"
import { MathText } from "../math-text.js"

const OPTION_FIELDS = [
  { key: "a", field: "optionA" },
  { key: "b", field: "optionB" },
  { key: "c", field: "optionC" },
  { key: "d", field: "optionD" }
] as const

type BankQuestionReadonlyBodyProps = Pick<
  BankQuestion,
  "text" | "optionA" | "optionB" | "optionC" | "optionD" | "correctAnswer"
>

function formatCorrectAnswer(correctAnswer: string | null | undefined): string {
  if (!correctAnswer) return "—"
  return correctAnswer.toUpperCase()
}

function BankQuestionReadonlyBody({ question }: { question: BankQuestionReadonlyBodyProps }) {
  const { correctAnswer, optionA, optionB, optionC, optionD, text } = question
  const optionsByField: Record<string, string | null | undefined> = {
    optionA,
    optionB,
    optionC,
    optionD
  }
  const options = OPTION_FIELDS.flatMap(({ field, key }) => {
    const value = optionsByField[field]
    if (!value) return []
    return [{ key, value }]
  })
  const correctKey = correctAnswer?.toLowerCase() ?? ""
  const answerLabel = formatCorrectAnswer(correctAnswer)

  return (
    <div className="space-y-4">
      <p className="text-body text-text-primary whitespace-pre-line">
        <MathText text={text} />
      </p>

      {options.length > 0 ?
        (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body-sm font-medium text-text-primary">Pilihan jawaban</p>
              {answerLabel !== "—" ?
                (
                  <span
                    className="font-mono text-caption bg-bg-muted px-1.5 py-0.5 rounded-xs shrink-0"
                    data-testid="bank-readonly-answer-key"
                    aria-label={`Kunci jawaban: ${answerLabel}`}
                  >
                    Kunci {answerLabel}
                  </span>
                ) :
                null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {options.map((option) => (
                <div
                  key={option.key}
                  data-testid={`bank-readonly-option-${option.key}`}
                  className={`text-body-sm px-3 py-1.5 rounded-xs flex gap-2 ${
                    correctKey === option.key
                      ? "bg-success-bg text-success-fg font-medium"
                      : "text-text-secondary"
                  }`}
                >
                  <span className="font-mono text-caption shrink-0">
                    {option.key.toUpperCase()}.
                  </span>
                  <span>
                    <MathText text={option.value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) :
        null}
    </div>
  )
}

export type { BankQuestionReadonlyBodyProps }
export { BankQuestionReadonlyBody }
