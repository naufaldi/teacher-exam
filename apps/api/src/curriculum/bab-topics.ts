import type { CurriculumBabTopic } from "@teacher-exam/shared"
import { listBabTopicsFromMarkdown } from "./parse-bab.js"

export function listBabTopicsFromCorpusText(markdownText: string): ReadonlyArray<CurriculumBabTopic> {
  return listBabTopicsFromMarkdown(markdownText)
}
