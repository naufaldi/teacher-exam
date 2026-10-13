export const MCQ_OPTION_LETTERS = ["a", "b", "c", "d"] as const

export type McqOptionLetter = (typeof MCQ_OPTION_LETTERS)[number]

export type FormattedMcqOption = {
  readonly label: string
  readonly line: string
  readonly text: string
}

function stripSameLetter(letter: McqOptionLetter, body: string): string {
  let rest = body.trim()
  const marker = new RegExp(`^${letter}\\s*[.)]\\s*`, "i")
  while (marker.test(rest)) {
    rest = rest.replace(marker, "").trim()
  }
  return rest
}

export function formatMcqOption(letter: McqOptionLetter, body: string): FormattedMcqOption {
  const text = stripSameLetter(letter, body)
  const label = `${letter}.`
  const line = text.length === 0 ? label : `${label} ${text}`
  return { label, line, text }
}
