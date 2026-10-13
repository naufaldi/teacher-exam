import {
  type DiagramQuestion,
  figureForAnswer,
  type GeneratedQuestion,
  type TopicDiagramKind
} from "@teacher-exam/shared"
import { Match } from "effect"
import { generatedDiagramNeedsRetry } from "./ai-generate-mappers"

const TOPIC_KINDS: ReadonlyArray<{ kind: TopicDiagramKind; pattern: RegExp }> = [
  { kind: "fraction", pattern: /pecahan/i },
  { kind: "number_line", pattern: /garis bilangan/i },
  { kind: "bar_chart", pattern: /diagram batang|grafik batang/i }
]

function mentionsClock(text: string): boolean {
  const lower = text.toLowerCase()
  const pengukuranAt = lower.indexOf("pengukuran")
  if (pengukuranAt >= 0 && !lower.slice(pengukuranAt + "pengukuran".length).startsWith(" luas")) {
    return true
  }
  let from = 0
  while (from < lower.length) {
    const at = lower.indexOf("jam", from)
    if (at < 0) return false
    const before = at === 0 ? "" : lower.charAt(at - 1)
    const after = lower.charAt(at + 3)
    const letter = /[a-zà-ÿ]/
    if (!letter.test(before) && !letter.test(after)) return true
    from = at + 3
  }
  return false
}

function topicDiagramKinds(topics: ReadonlyArray<string>): ReadonlyArray<TopicDiagramKind> {
  const haystack = topics.join("\n")
  const kinds = TOPIC_KINDS.flatMap((row) => row.pattern.test(haystack) ? [row.kind] : [])
  if (mentionsClock(haystack)) return ["clock", ...kinds]
  return kinds
}

function toDiagram(question: GeneratedQuestion): DiagramQuestion {
  return Match.value(question).pipe(
    Match.tag("mcq_single", (row) => ({
      _tag: "mcq_single" as const,
      options: { a: row.option_a, b: row.option_b, c: row.option_c, d: row.option_d },
      correct: row.correct_answer
    })),
    Match.tag("mcq_multi", (row) => ({
      _tag: "mcq_multi" as const,
      options: { a: row.option_a, b: row.option_b, c: row.option_c, d: row.option_d },
      correct: row.correct_answers
    })),
    Match.tag("true_false", (row) => ({
      _tag: "true_false" as const,
      statements: row.statements.map((statement) => ({
        text: statement.text,
        answer: statement.answer === "B"
      }))
    })),
    Match.exhaustive
  )
}

export function attachTopicDiagram(
  question: GeneratedQuestion,
  topics: ReadonlyArray<string>
): GeneratedQuestion {
  const hasFigure = question.figure !== undefined && question.figure !== null
  if (hasFigure && !generatedDiagramNeedsRetry(question)) return question
  const diagram = toDiagram(question)
  const form = question.number % 2 === 0 ? "circle" as const : "bar" as const
  for (const kind of topicDiagramKinds([question.topic, ...topics])) {
    const figure = figureForAnswer(kind, diagram, form)
    if (figure !== null) return { ...question, figure }
  }
  return question
}
