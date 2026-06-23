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

const READY_CURRENT_BOOKS: ReadonlyArray<{
  subjectKey: ExamSubject
  grade: (typeof GRADES)[number]
  sourceFilename: string
}> = [
  { subjectKey: "bahasa_indonesia", grade: 1, sourceFilename: "Bahasa_Indonesia_BS_KLS_I_Rev.pdf" },
  { subjectKey: "bahasa_indonesia", grade: 2, sourceFilename: "Indonesia_BS_KLS_II_Rev.pdf" },
  { subjectKey: "bahasa_indonesia", grade: 3, sourceFilename: "Indonesia_BS_KLS_III_Rev+.pdf" },
  { subjectKey: "bahasa_indonesia", grade: 5, sourceFilename: "Indonesia_BS_KLS_V_Rev.pdf" },
  {
    subjectKey: "bahasa_indonesia",
    grade: 6,
    sourceFilename: "Indonesia_BS_KLS_VI_Rev.pdf"
  },
  {
    subjectKey: "pendidikan_pancasila",
    grade: 1,
    sourceFilename: "Pendidikan-Pancasila-BS-KLS-I.pdf"
  },
  {
    subjectKey: "pendidikan_pancasila",
    grade: 2,
    sourceFilename: "Pendidikan-Pancasila-BS-KLS-II.pdf"
  },
  {
    subjectKey: "pendidikan_pancasila",
    grade: 4,
    sourceFilename: "Pendidikan-Pancasila-BS-KLS-IV.pdf"
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
  { subjectKey: "ipas", grade: 3, sourceFilename: "IPAS_BS_KLS_III.pdf" },
  { subjectKey: "ipas", grade: 4, sourceFilename: "IPAS_BS_KLS_IV_Rev.pdf" },
  { subjectKey: "ipas", grade: 5, sourceFilename: "IPAS_BS_KLS_V_Rev.pdf" },
  { subjectKey: "ipas", grade: 6, sourceFilename: "IPAS_BS_KLS_VI_Rev.pdf" },
  { subjectKey: "bahasa_inggris", grade: 3, sourceFilename: "Inggris_FN_BS_KLS_III.pdf" },
  { subjectKey: "bahasa_inggris", grade: 4, sourceFilename: "Inggris_FN_BS_KLS_IV.pdf" },
  { subjectKey: "bahasa_inggris", grade: 5, sourceFilename: "Inggris_FN_BS_KLS_V.pdf" },
  { subjectKey: "bahasa_inggris", grade: 6, sourceFilename: "Inggris_FN_BS_KLS_VI.pdf" },
  { subjectKey: "matematika", grade: 1, sourceFilename: "Matematika-BS-KLS-I.pdf" },
  { subjectKey: "matematika", grade: 2, sourceFilename: "Matematika-BS-KLS-II.pdf" },
  { subjectKey: "matematika", grade: 3, sourceFilename: "Matematika_BS_KLS_III.pdf" },
  { subjectKey: "matematika", grade: 4, sourceFilename: "Matematika-BS-KLS-IV.pdf" },
  { subjectKey: "matematika", grade: 5, sourceFilename: "Matematika-BS-KLS-V.pdf" },
  { subjectKey: "matematika", grade: 6, sourceFilename: "Matematika_BS_KLS_VI.pdf" }
]

const CURRENT_SOURCE_FILENAMES = new Map<string, string>([
  ["bahasa_indonesia:1", "Bahasa_Indonesia_BS_KLS_I_Rev.pdf"],
  ["bahasa_indonesia:2", "Indonesia_BS_KLS_II_Rev.pdf"],
  ["bahasa_indonesia:3", "Indonesia_BS_KLS_III_Rev+.pdf"],
  ["bahasa_indonesia:5", "Indonesia_BS_KLS_V_Rev.pdf"],
  ["bahasa_indonesia:6", "Indonesia_BS_KLS_VI_Rev.pdf"],
  ["pendidikan_pancasila:1", "Pendidikan-Pancasila-BS-KLS-I.pdf"],
  ["pendidikan_pancasila:2", "Pendidikan-Pancasila-BS-KLS-II.pdf"],
  ["pendidikan_pancasila:3", "Pendidikan-Pancasila-BS-KLS-III.pdf"],
  ["pendidikan_pancasila:4", "Pendidikan-Pancasila-BS-KLS-IV.pdf"],
  ["pendidikan_pancasila:5", "Pendidikan-Pancasila-BS-KLS-V.pdf"],
  ["pendidikan_pancasila:6", "Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf"],
  ["ipas:3", "IPAS_BS_KLS_III.pdf"],
  ["ipas:4", "IPAS_BS_KLS_IV_Rev.pdf"],
  ["ipas:5", "IPAS_BS_KLS_V_Rev.pdf"],
  ["ipas:6", "IPAS_BS_KLS_VI_Rev.pdf"],
  ["bahasa_inggris:3", "Inggris_FN_BS_KLS_III.pdf"],
  ["bahasa_inggris:4", "Inggris_FN_BS_KLS_IV.pdf"],
  ["bahasa_inggris:5", "Inggris_FN_BS_KLS_V.pdf"],
  ["bahasa_inggris:6", "Inggris_FN_BS_KLS_VI.pdf"],
  ["matematika:1", "Matematika-BS-KLS-I.pdf"],
  ["matematika:2", "Matematika-BS-KLS-II.pdf"],
  ["matematika:3", "Matematika_BS_KLS_III.pdf"],
  ["matematika:4", "Matematika-BS-KLS-IV.pdf"],
  ["matematika:5", "Matematika-BS-KLS-V.pdf"],
  ["matematika:6", "Matematika_BS_KLS_VI.pdf"]
])

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
  grade: (typeof GRADES)[number],
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
  const sourceFilename = CURRENT_SOURCE_FILENAMES.get(`${subjectKey}:${grade}`)
  const ready = READY_CURRENT_BOOKS.find((entry) => entry.subjectKey === subjectKey && entry.grade === grade)
  if (ready !== undefined) {
    return readyEntry(subjectKey, ready.grade, ready.sourceFilename)
  }

  if (subjectKey === "matematika" && (grade === 5 || grade === 6) && sourceFilename !== undefined) {
    return {
      subjectKey,
      label: SUBJECT_LABEL[subjectKey],
      grade,
      phase: phaseForGrade(grade),
      curriculumVersion: CURRICULUM_VERSION,
      sourceType: "sibi_pdf",
      sourceFilename,
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

  if (sourceFilename !== undefined) {
    return {
      subjectKey,
      label: SUBJECT_LABEL[subjectKey],
      grade,
      phase: phaseForGrade(grade),
      curriculumVersion: CURRICULUM_VERSION,
      sourceType: "sibi_pdf",
      sourceFilename,
      status: "missing"
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
