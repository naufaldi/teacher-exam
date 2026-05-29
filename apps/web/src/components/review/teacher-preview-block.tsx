import { MathText } from "../math-text.js"

export function TeacherPreviewBlock({
  testId,
  text,
  variant = "stem"
}: {
  text: string
  testId?: string
  variant?: "stem" | "option"
}) {
  if (variant === "option") {
    return (
      <div
        className="rounded-sm border border-border-default bg-kertas-50 px-2.5 py-2 min-h-10 flex flex-col justify-center min-w-0"
        {...(testId !== undefined ? { "data-testid": testId } : {})}
      >
        <p className="text-caption font-medium text-text-tertiary mb-1">Pratinjau tampilan guru</p>
        <div className="text-body-sm text-text-primary whitespace-pre-line">
          <MathText text={text} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-sm border border-border-default bg-kertas-50 p-3 flex-1 min-w-0"
      {...(testId !== undefined ? { "data-testid": testId } : {})}
    >
      <p className="text-caption font-medium text-text-tertiary mb-2">Pratinjau tampilan guru</p>
      <p className="text-body text-text-primary whitespace-pre-line">
        <MathText text={text} />
      </p>
    </div>
  )
}
