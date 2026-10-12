export const MCQ_OPTION_LETTERS = ["a", "b", "c", "d"] as const

export type McqOptionLetter = (typeof MCQ_OPTION_LETTERS)[number]

export type FormattedMcqOption = {
  readonly line: string
  readonly text: string
}

export function formatMcqOption(letter: McqOptionLetter, body: string): FormattedMcqOption {
  const text = body.trim()
  const line = text.length === 0 ? `${letter}.` : `${letter}. ${text}`
  return { line, text }
}
