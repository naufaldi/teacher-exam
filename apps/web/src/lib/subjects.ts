import type { ExamSubject } from '@teacher-exam/shared'

export type SubjectBadgeVariant =
  | 'subject-bi'
  | 'subject-ppkn'
  | 'subject-ipas'
  | 'subject-bing'
  | 'secondary'

interface SubjectMeta {
  value: ExamSubject
  label: string
  short: string
  badgeVariant: SubjectBadgeVariant
  dotClass: string
}

export const SUBJECT_OPTIONS: readonly SubjectMeta[] = [
  {
    value: 'bahasa_indonesia',
    label: 'Bahasa Indonesia',
    short: 'BI',
    badgeVariant: 'subject-bi',
    dotClass: 'text-subject-bi',
  },
  {
    value: 'pendidikan_pancasila',
    label: 'Pendidikan Pancasila',
    short: 'PPKN',
    badgeVariant: 'subject-ppkn',
    dotClass: 'text-subject-ppkn',
  },
  {
    value: 'ipas',
    label: 'IPAS',
    short: 'IPAS',
    badgeVariant: 'subject-ipas',
    dotClass: 'text-subject-ipas',
  },
  {
    value: 'bahasa_inggris',
    label: 'Bahasa Inggris',
    short: 'BING',
    badgeVariant: 'subject-bing',
    dotClass: 'text-subject-bing',
  },
  {
    value: 'matematika',
    label: 'Matematika',
    short: 'MTK',
    badgeVariant: 'secondary',
    dotClass: 'text-text-secondary',
  },
] as const

const SUBJECT_META = Object.fromEntries(
  SUBJECT_OPTIONS.map((subject) => [subject.value, subject]),
) as Record<ExamSubject, SubjectMeta>

const FALLBACK_SUBJECT: SubjectMeta = {
  value: 'bahasa_indonesia',
  label: 'Mata Pelajaran',
  short: '?',
  badgeVariant: 'subject-bi',
  dotClass: 'text-text-tertiary',
}

export function subjectMetaFor(subject: ExamSubject | string): SubjectMeta {
  return SUBJECT_META[subject as ExamSubject] ?? FALLBACK_SUBJECT
}
