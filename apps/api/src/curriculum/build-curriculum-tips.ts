import type { CurriculumTipsResponse, ExamSubject, Grade } from "@teacher-exam/shared"
import { phaseForGrade, SUBJECT_LABEL } from "@teacher-exam/shared"
import { getCurriculumFallback } from "../lib/curriculum.js"
import { parseCpTipsFromCorpusText } from "./parse-cp.js"

function phaseFooterForGrade(grade: Grade): string {
  const phase = phaseForGrade(grade)
  if (phase === "A") return "CP identik untuk Kelas 1 dan 2 — tidak perlu input manual."
  if (phase === "B") return "CP identik untuk Kelas 3 dan 4 — tidak perlu input manual."
  return "CP identik untuk Kelas 5 dan 6 — tidak perlu input manual."
}

function tipsTitleForSubject(subjectLabel: string): string {
  return `Capaian Pembelajaran ${subjectLabel}`
}

function tipsIntroForSubject(subjectLabel: string): string {
  return `Sistem memakai Capaian Pembelajaran berikut secara otomatis saat Anda memilih mapel ${subjectLabel}. Topik di form generate akan menyesuaikan.`
}

export function buildCurriculumTipsResponse(
  subject: ExamSubject,
  grade: Grade,
  corpusText: string
): CurriculumTipsResponse {
  const subjectLabel = SUBJECT_LABEL[subject]
  const phase = phaseForGrade(grade)

  let elements = [...parseCpTipsFromCorpusText(corpusText)]
  let source: CurriculumTipsResponse["source"] = "corpus"

  if (elements.length === 0) {
    elements = [...parseCpTipsFromCorpusText(getCurriculumFallback(subject))]
    source = "fallback"
  }

  return {
    subject,
    grade,
    phase,
    subjectLabel,
    title: tipsTitleForSubject(subjectLabel),
    intro: tipsIntroForSubject(subjectLabel),
    elements,
    footer: phaseFooterForGrade(grade),
    source
  }
}
