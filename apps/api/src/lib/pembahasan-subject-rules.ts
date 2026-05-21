import { Match } from 'effect'
import { buildMatematikaLatexPromptRules } from './matematika-latex-prompt.js'

const KNOWN_SUBJECT_LABELS = [
  'Matematika',
  'Bahasa Indonesia',
  'Pendidikan Pancasila',
  'IPAS',
  'Bahasa Inggris',
] as const

export type KnownPembahasanSubject = (typeof KNOWN_SUBJECT_LABELS)[number]

type KnownSubjectKey =
  | 'matematika'
  | 'bahasa_indonesia'
  | 'pendidikan_pancasila'
  | 'ipas'
  | 'bahasa_inggris'

export function normalizeSubjectLabel(subject: string): string {
  const trimmed = subject.trim()
  const lower = trimmed.toLowerCase()
  for (const label of KNOWN_SUBJECT_LABELS) {
    if (label.toLowerCase() === lower) return label
  }
  return trimmed
}

export function resolveKnownSubjectKey(subject: string): KnownSubjectKey | null {
  const normalized = normalizeSubjectLabel(subject)
  return Match.value(normalized).pipe(
    Match.when('Matematika', () => 'matematika' as const),
    Match.when('Bahasa Indonesia', () => 'bahasa_indonesia' as const),
    Match.when('Pendidikan Pancasila', () => 'pendidikan_pancasila' as const),
    Match.when('IPAS', () => 'ipas' as const),
    Match.when('Bahasa Inggris', () => 'bahasa_inggris' as const),
    Match.orElse(() => null),
  )
}

export function buildPembahasanGradeRules(grade: number): readonly string[] {
  if (grade <= 5) {
    return [
      'Aturan kedalaman kelas 5:',
      '- **Langkah:** 2–3 langkah bernomor; pakai contoh sehari-hari (uang jajan, mainan, sekolah).',
      '- **Penjelasan:** 2–3 kalimat; ~10–15 kata per kalimat; sangat konkret.',
      '- **Opsi Lain:** 1 alasan singkat per opsi salah.',
      '- **Tip:** 1 kalimat mudah diingat.',
    ]
  }

  return [
    'Aturan kedalaman kelas 6:',
    '- **Langkah:** 3–5 langkah bernomor; boleh hubungkan konsep terkait.',
    '- **Penjelasan:** 3–4 kalimat; ~12–18 kata per kalimat; istilah sederhana boleh dipakai.',
    '- **Opsi Lain:** jelaskan alasan tiap opsi salah; sebut kesalahan umum siswa sebaya jika relevan.',
    '- **Tip:** 1–2 kalimat strategi yang bisa dipakai lagi.',
  ]
}

export function buildGeneralPembahasanRules(subject: string, grade: number): readonly string[] {
  return [
    `Aturan umum mata pelajaran ${subject}:`,
    '- **Langkah:** baca pertanyaan → pahami topik/konsep yang ditanyakan → cari bukti/alasan dari stem atau opsi → simpulkan jawaban.',
    '- **Penjelasan:** jelaskan mengapa jawaban benar dengan alasan yang jelas dan sesuai topik soal.',
    '- **Opsi Lain:** jelaskan tiap opsi salah dengan alasan spesifik terkait isi soal (bukan "karena bukan jawaban").',
    '- **Tip:** beri strategi umum mengerjakan soal sejenis di mata pelajaran ini.',
    '- Gunakan field `topic` dari JSON user jika ada, untuk menyesuaikan fokus pembahasan.',
    `- Tetap tulis untuk siswa kelas ${grade} SD; hindari istilah akademik tinggi.`,
    '- Untuk true_false: jelaskan setiap pernyataan B/S di **Langkah** atau **Penjelasan** (lewati **Opsi Lain**).',
  ]
}

function buildMatematikaPembahasanRules(): readonly string[] {
  return [
    'Aturan Matematika:',
    '- **Langkah** wajib berisi perhitungan bertahap (tulis setiap langkah hitung).',
    '- Pakai LaTeX untuk ekspresi matematika di **Langkah** dan **Penjelasan**.',
    '- Contoh: daftar kelipatan untuk KPK, urutan digit untuk banding bilangan, pembagian rata.',
    '- **Opsi Lain:** sebut kesalahan operasi atau urutan langkah yang salah.',
    '- Untuk true_false: jelaskan setiap pernyataan B/S di **Langkah** atau **Penjelasan** (lewati **Opsi Lain**).',
    ...buildMatematikaLatexPromptRules(),
  ]
}

function buildBahasaIndonesiaPembahasanRules(): readonly string[] {
  return [
    'Aturan Bahasa Indonesia:',
    '- **Langkah:** baca pertanyaan dan teks bacaan → tentukan tipe soal (ide pokok, detail, kosakata, tata bahasa) → cari bukti di teks → pilih jawaban.',
    '- **Penjelasan:** sebut bukti singkat (kalimat/frasa kunci) tanpa menyalin teks panjang.',
    '- **Opsi Lain:** jelaskan kenapa opsi tidak sesuai isi teks (salah baca, ide pokok vs detail, dll.).',
    '- Untuk true_false: jelaskan setiap pernyataan B/S di **Langkah** atau **Penjelasan** (lewati **Opsi Lain**).',
  ]
}

function buildPpknPembahasanRules(): readonly string[] {
  return [
    'Aturan Pendidikan Pancasila:',
    '- **Langkah:** baca situasi → tentukan nilai/sikap/norma yang relevan → cocokkan dengan opsi.',
    '- **Penjelasan:** hubungkan jawaban dengan nilai Pancasila, hak/kewajiban, toleransi, atau NKRI.',
    '- **Opsi Lain:** jelaskan opsi yang salah karena melanggar nilai atau salah paham aturan/norma.',
    '- Untuk true_false: jelaskan setiap pernyataan B/S di **Langkah** atau **Penjelasan** (lewati **Opsi Lain**).',
  ]
}

function buildIpasPembahasanRules(): readonly string[] {
  return [
    'Aturan IPAS:',
    '- **Langkah:** baca masalah/fenomena → tentukan konsep IPA atau IPS → gunakan data/pengamatan → simpulkan.',
    '- **Penjelasan:** jelaskan proses/sebab-akibat dengan contoh sehari-hari.',
    '- **Opsi Lain:** sebut kesalahan konsep (urutan proses, campur sebab-akibat, salah baca data).',
    '- Untuk true_false: jelaskan setiap pernyataan B/S di **Langkah** atau **Penjelasan** (lewati **Opsi Lain**).',
  ]
}

function buildBahasaInggrisPembahasanRules(): readonly string[] {
  return [
    'Aturan Bahasa Inggris:',
    '- **Langkah:** baca teks/instruksi Inggris → pahami kata kunci → cari jawaban dari stem atau opsi.',
    '- **Penjelasan:** tulis dalam Bahasa Indonesia; istilah Inggris dari stem boleh dalam tanda kurung.',
    '- **Opsi Lain:** tulis dalam Bahasa Indonesia; sebut distraktor (arti kata, tense, homonym) jika relevan.',
    '- Untuk true_false: jelaskan setiap pernyataan B/S di **Langkah** atau **Penjelasan** (lewati **Opsi Lain**).',
  ]
}

function buildKnownSubjectRules(key: KnownSubjectKey): readonly string[] {
  return Match.value(key).pipe(
    Match.when('matematika', () => buildMatematikaPembahasanRules()),
    Match.when('bahasa_indonesia', () => buildBahasaIndonesiaPembahasanRules()),
    Match.when('pendidikan_pancasila', () => buildPpknPembahasanRules()),
    Match.when('ipas', () => buildIpasPembahasanRules()),
    Match.when('bahasa_inggris', () => buildBahasaInggrisPembahasanRules()),
    Match.exhaustive,
  )
}

export function buildPembahasanSubjectRules(subject: string, grade: number): readonly string[] {
  const normalized = normalizeSubjectLabel(subject)
  const key = resolveKnownSubjectKey(normalized)
  if (key === null) {
    return buildGeneralPembahasanRules(normalized, grade)
  }
  return buildKnownSubjectRules(key)
}

export function isKnownPembahasanSubject(subject: string): boolean {
  return resolveKnownSubjectKey(subject) !== null
}
