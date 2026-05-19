import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExamSubject } from '@teacher-exam/shared'

const cache = new Map<string, Promise<string>>()

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const MD_DIR = join(MODULE_DIR, '..', 'curriculum', 'md')

const SUBJECT_SLUG: Record<ExamSubject, 'bahasa-indonesia' | 'pendidikan-pancasila' | 'ipas' | 'bahasa-inggris'> = {
  bahasa_indonesia: 'bahasa-indonesia',
  pendidikan_pancasila: 'pendidikan-pancasila',
  ipas: 'ipas',
  bahasa_inggris: 'bahasa-inggris',
}

/**
 * Build the canonical curriculum markdown filename for `(subject, grade)`.
 * Shared by the runtime read path and the offline extractor so the two can
 * never disagree on the on-disk layout.
 */
export function curriculumMdFilename(subject: ExamSubject, grade: number): string {
  return `${SUBJECT_SLUG[subject]}-kelas-${grade}.md`
}

/** Absolute path to the markdown corpus for `(subject, grade)`. */
export function curriculumMdPath(subject: ExamSubject, grade: number): string {
  return join(MD_DIR, curriculumMdFilename(subject, grade))
}

/**
 * Load the curriculum markdown for `(subject, grade)` from the extracted
 * corpus. Falls back to a CP-only PRD §8 stub when the file is missing so
 * the API stays usable before the extractor has been run.
 *
 * Cached per `(subject, grade)` for the lifetime of the process; concurrent
 * callers share the same in-flight read.
 */
export function getCurriculumText(subject: ExamSubject, grade: number): Promise<string> {
  const key = `${subject}-${grade}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const promise = loadCurriculumText(subject, grade)
  cache.set(key, promise)
  return promise
}

async function loadCurriculumText(subject: ExamSubject, grade: number): Promise<string> {
  const path = curriculumMdPath(subject, grade)
  try {
    return await readFile(path, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    console.warn(`[curriculum] missing ${path} — using PRD §8 fallback`)
    return FALLBACK[SUBJECT_SLUG[subject]]
  }
}

/** Reset the in-memory cache. Test-only escape hatch. */
export function __resetCurriculumCache(): void {
  cache.clear()
}

// Keyed by subject only — Fase C CP is identical for K5 and K6 (PRD §1.4).
const FALLBACK: Record<'bahasa-indonesia' | 'pendidikan-pancasila' | 'ipas' | 'bahasa-inggris', string> = {
  'bahasa-indonesia': `# Bahasa Indonesia — Fase C (Kurikulum Merdeka)

## Capaian Pembelajaran
- Menyimak: Menganalisis informasi dengan mengidentifikasi ciri objek, urutan proses kejadian, dan nilai-nilai dari berbagai tipe teks nonfiksi dan fiksi (lisan, teks aural, audio).
- Membaca dan Memirsa: Membaca dengan fasih; memahami kosakata bermakna denotatif, konotatif, dan kiasan; mengidentifikasi ide pokok dari teks deskripsi, narasi, eksposisi; serta nilai-nilai dalam teks sastra (prosa, pantun, puisi).
- Berbicara dan Mempresentasikan: Menyampaikan informasi secara lisan untuk menghibur dan meyakinkan; menggunakan kosakata baru; memilih kata sesuai norma sosial budaya; mempresentasikan gagasan secara logis, sistematis, kritis.
- Menulis: Menulis berbagai tipe teks dengan kalimat kompleks secara kreatif; menggunakan kaidah kebahasaan dan kosakata bermakna denotatif dan konotatif.

> Catatan: korpus Buku Siswa belum diekstrak. Soal akan didasarkan pada CP saja, tanpa daftar bab/sub-konsep/sample teks. Jalankan \`pnpm --filter @teacher-exam/api curriculum:extract\` untuk korpus penuh.
`,
  'pendidikan-pancasila': `# Pendidikan Pancasila — Fase C (Kurikulum Merdeka)

## Capaian Pembelajaran
- Pancasila: Memahami hubungan antarsila sebagai kesatuan utuh; mengidentifikasi makna nilai Pancasila sebagai pandangan hidup; menerapkan nilai Pancasila di lingkungan keluarga, sekolah, dan masyarakat.
- UUD NRI 1945: Menganalisis bentuk sederhana norma, aturan, hak, dan kewajiban sebagai anggota keluarga, warga sekolah, dan bagian masyarakat.
- Bhinneka Tunggal Ika: Menghargai keberagaman budaya dan agama; menunjukkan sikap toleran terhadap perbedaan.
- NKRI: Mengenal wilayah kabupaten/kota/provinsi sebagai bagian NKRI; membangun kebersamaan, persatuan, dan berkontribusi di lingkungan.

> Catatan: korpus Buku Siswa belum diekstrak. Soal akan didasarkan pada CP saja, tanpa daftar bab/sub-konsep/sample teks. Jalankan \`pnpm --filter @teacher-exam/api curriculum:extract\` untuk korpus penuh.
`,
  ipas: `# IPAS — Fase C (Kurikulum Merdeka)

## Capaian Pembelajaran
- Peserta didik menyelidiki makhluk hidup, benda, energi, dan perubahannya melalui pengamatan sederhana serta bukti yang dapat dijelaskan.
- Peserta didik memahami hubungan antara manusia, lingkungan, ekosistem, dan pemanfaatan sumber daya secara bertanggung jawab.
- Peserta didik mengenal gejala alam, tata surya, dan perubahan permukaan bumi dalam konteks kehidupan sehari-hari.
- Peserta didik mengomunikasikan hasil penyelidikan IPAS dengan bahasa ilmiah sederhana, data, tabel, dan alasan yang runtut.

> Catatan: korpus Buku Siswa belum tersedia. Soal akan didasarkan pada CP Fase C dan topik umum IPAS kelas 5-6.
`,
  'bahasa-inggris': `# Bahasa Inggris — Fase C (Kurikulum Merdeka)

## Capaian Pembelajaran
- Learners understand short spoken and written texts about familiar school, home, and community contexts.
- Learners use simple English expressions to ask, answer, describe, compare, and give opinions with support.
- Learners read short functional, descriptive, narrative, and procedural texts for main ideas and details.
- Learners write short guided sentences or paragraphs with appropriate vocabulary, punctuation, and structure.

> Catatan: korpus Buku Siswa belum tersedia. Stems and options should use English, while explanations may use Indonesian.
`,
}
