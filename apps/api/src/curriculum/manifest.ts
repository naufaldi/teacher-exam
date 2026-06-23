/**
 * Curriculum source manifest — single source of truth for subject×grade readiness.
 *
 * Entry count: 102 rows
 * - 30 current core subjects (5 mapel × Kelas 1–6)
 * - 72 future RFC catalog subjects (agama×6, PJOK, seni×4, muatan lokal × Kelas 1–6)
 */
import {
  CURRICULUM_VERSION,
  type CurriculumSourceManifestItem,
  type ExamSubject,
  phaseForGrade,
  SUBJECT_LABEL
} from "@teacher-exam/shared"

const GRADES = [1, 2, 3, 4, 5, 6] as const

const READY_K56: ReadonlyArray<{
  subjectKey: ExamSubject
  grade: 5 | 6
  sourceFilename: string
}> = [
  { subjectKey: "bahasa_indonesia", grade: 5, sourceFilename: "Indonesia_BS_KLS_V_Rev.pdf" },
  {
    subjectKey: "bahasa_indonesia",
    grade: 6,
    sourceFilename: "Bahasa-Indonesia-BS-KLS-VI_compressed.pdf"
  },
  {
    subjectKey: "pendidikan_pancasila",
    grade: 5,
    sourceFilename: "Pendidikan-Pancasila-BS-KLS-V.pdf"
  },
  {
    subjectKey: "pendidikan_pancasila",
    grade: 6,
    sourceFilename: "Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf"
  },
  { subjectKey: "ipas", grade: 5, sourceFilename: "IPAS_BS_KLS_V_Rev.pdf" },
  { subjectKey: "ipas", grade: 6, sourceFilename: "IPAS_BS_KLS_VI_Rev.pdf" },
  { subjectKey: "bahasa_inggris", grade: 5, sourceFilename: "Inggris_FN_BS_KLS_V.pdf" },
  { subjectKey: "bahasa_inggris", grade: 6, sourceFilename: "Inggris_FN_BS_KLS_VI.pdf" }
]

const CURRENT_SUBJECTS: ReadonlyArray<ExamSubject> = [
  "bahasa_indonesia",
  "pendidikan_pancasila",
  "ipas",
  "bahasa_inggris",
  "matematika"
]

const FUTURE_SUBJECTS: ReadonlyArray<{ subjectKey: string; label: string }> = [
  {
    subjectKey: "pendidikan_agama_islam_budi_pekerti",
    label: "Pendidikan Agama Islam dan Budi Pekerti"
  },
  {
    subjectKey: "pendidikan_agama_kristen_budi_pekerti",
    label: "Pendidikan Agama Kristen dan Budi Pekerti"
  },
  {
    subjectKey: "pendidikan_agama_katolik_budi_pekerti",
    label: "Pendidikan Agama Katolik dan Budi Pekerti"
  },
  {
    subjectKey: "pendidikan_agama_hindu_budi_pekerti",
    label: "Pendidikan Agama Hindu dan Budi Pekerti"
  },
  {
    subjectKey: "pendidikan_agama_buddha_budi_pekerti",
    label: "Pendidikan Agama Buddha dan Budi Pekerti"
  },
  {
    subjectKey: "pendidikan_agama_khonghucu_budi_pekerti",
    label: "Pendidikan Agama Khonghucu dan Budi Pekerti"
  },
  { subjectKey: "pjok", label: "PJOK" },
  { subjectKey: "seni_musik", label: "Seni Musik" },
  { subjectKey: "seni_rupa", label: "Seni Rupa" },
  { subjectKey: "seni_teater", label: "Seni Teater" },
  { subjectKey: "seni_tari", label: "Seni Tari" },
  { subjectKey: "muatan_lokal", label: "Muatan Lokal" }
]

function readyEntry(
  subjectKey: ExamSubject,
  grade: 5 | 6,
  sourceFilename: string
): CurriculumSourceManifestItem {
  return {
    subjectKey,
    label: SUBJECT_LABEL[subjectKey],
    grade,
    phase: phaseForGrade(grade),
    curriculumVersion: CURRICULUM_VERSION,
    sourceType: "sibi_pdf",
    sourceFilename,
    status: "ready"
  }
}

function currentSubjectEntry(
  subjectKey: ExamSubject,
  grade: (typeof GRADES)[number]
): CurriculumSourceManifestItem {
  const ready = READY_K56.find((entry) => entry.subjectKey === subjectKey && entry.grade === grade)
  if (ready !== undefined) {
    return readyEntry(subjectKey, ready.grade, ready.sourceFilename)
  }

  if (subjectKey === "matematika" && (grade === 5 || grade === 6)) {
    return {
      subjectKey,
      label: SUBJECT_LABEL[subjectKey],
      grade,
      phase: phaseForGrade(grade),
      curriculumVersion: CURRICULUM_VERSION,
      sourceType: "cp_only",
      status: "stubbed"
    }
  }

  if (subjectKey === "ipas" && (grade === 1 || grade === 2)) {
    return {
      subjectKey,
      label: SUBJECT_LABEL[subjectKey],
      grade,
      phase: phaseForGrade(grade),
      curriculumVersion: CURRICULUM_VERSION,
      sourceType: "sibi_pdf",
      status: "disabled"
    }
  }

  return {
    subjectKey,
    label: SUBJECT_LABEL[subjectKey],
    grade,
    phase: phaseForGrade(grade),
    curriculumVersion: CURRICULUM_VERSION,
    sourceType: "sibi_pdf",
    status: "missing"
  }
}

function futureSubjectEntry(
  subjectKey: string,
  label: string,
  grade: (typeof GRADES)[number]
): CurriculumSourceManifestItem {
  const isMuatanLokal = subjectKey === "muatan_lokal"
  return {
    subjectKey,
    label,
    grade,
    phase: phaseForGrade(grade),
    curriculumVersion: CURRICULUM_VERSION,
    sourceType: isMuatanLokal ? "school_local" : "sibi_pdf",
    status: isMuatanLokal ? "disabled" : "missing"
  }
}

export const CURRICULUM_MANIFEST: ReadonlyArray<CurriculumSourceManifestItem> = [
  ...CURRENT_SUBJECTS.flatMap((subjectKey) => GRADES.map((grade) => currentSubjectEntry(subjectKey, grade))),
  ...FUTURE_SUBJECTS.flatMap(({ label, subjectKey }) =>
    GRADES.map((grade) => futureSubjectEntry(subjectKey, label, grade))
  )
]
