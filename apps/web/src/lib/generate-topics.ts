import type { ExamSubject } from "@teacher-exam/shared"

const TOPIK_BI = [
  "Pemahaman Bacaan",
  "Ide Pokok dan Gagasan Pendukung",
  "Unsur Intrinsik Cerita (Tokoh, Latar, Alur, Amanat)",
  "Teks Narasi",
  "Teks Eksplanasi",
  "Teks Deskripsi",
  "Teks Eksposisi",
  "Teks Persuasi",
  "Kosakata (Denotatif, Konotatif, Kiasan)",
  "Gaya Bahasa (Majas)",
  "Kalimat Langsung dan Tidak Langsung",
  "Kalimat Majemuk",
  "Tanda Baca dan Ejaan",
  "Puisi",
  "Cerpen dan Fabel",
  "Dongeng dan Legenda",
  "Surat Resmi dan Surat Pribadi",
  "Iklan",
  "Opini dan Fakta",
  "Ringkasan dan Kesimpulan"
] as const

const TOPIK_PPKN = [
  "Hubungan Antar-Sila dalam Pancasila",
  "Nilai-Nilai Pancasila sebagai Pandangan Hidup",
  "Penerapan Nilai Pancasila di Kehidupan Sehari-hari",
  "Pengamalan Pancasila di Lingkungan Keluarga, Sekolah, Masyarakat",
  "Norma dalam Kehidupan Bermasyarakat",
  "Hak dan Kewajiban Warga Negara",
  "Hak dan Kewajiban Anak",
  "Keberagaman Budaya Indonesia",
  "Keberagaman Agama dan Toleransi",
  "Menghormati Perbedaan",
  "Provinsi di Indonesia dan Wilayah NKRI",
  "Persatuan dan Kesatuan Bangsa",
  "Gotong Royong",
  "Musyawarah dan Pengambilan Keputusan"
] as const

const TOPIK_IPAS_K5 = [
  "Melihat karena Cahaya, Mendengar karena Bunyi",
  "Harmoni dalam Ekosistem",
  "Magnet, Listrik, dan Teknologi untuk Kehidupan",
  "Bumi Berubah",
  "Indonesiaku Kaya Raya",
  "Daerahku dan Warisan Budaya"
] as const

const TOPIK_IPAS_K6 = [
  "Tubuh Kita Tumbuh dan Bekerja",
  "Energi dan Perubahannya",
  "Benda, Campuran, dan Perubahan Materi",
  "Bumi, Bulan, Matahari, dan Tata Surya",
  "Bencana Alam dan Kesiapsiagaan",
  "Masyarakat, Teknologi, dan Keberlanjutan"
] as const

const TOPIK_BAHASA_INGGRIS_K5 = [
  "My Daily Activities",
  "At School",
  "Food and Drinks",
  "My House and My Room",
  "Animals Around Us",
  "Things We Wear"
] as const

const TOPIK_BAHASA_INGGRIS_K6 = [
  "My Past Experiences",
  "Directions and Public Places",
  "Stories and Moral Lessons",
  "Health and Safety",
  "Future Plans and Invitations",
  "Simple Reports about Nature and Technology"
] as const

const TOPIK_MATEMATIKA_K5 = [
  "Bilangan Cacah dan Operasi Hitung",
  "Pecahan, Desimal, dan Persen",
  "Pola dan Kalimat Matematika",
  "Pengukuran",
  "Data"
] as const

const TOPIK_MATEMATIKA_K6 = [
  "Bilangan dan Operasi",
  "Pecahan, Desimal, Rasio, dan Persen",
  "Pola, Relasi, dan Kalimat Matematika",
  "Pengukuran",
  "Data dan Peluang Awal"
] as const

type GenerateGrade = 5 | 6

export const TOPICS_BY_SUBJECT_AND_GRADE: Record<
  ExamSubject,
  Record<GenerateGrade, ReadonlyArray<string>>
> = {
  bahasa_indonesia: { 5: TOPIK_BI, 6: TOPIK_BI },
  pendidikan_pancasila: { 5: TOPIK_PPKN, 6: TOPIK_PPKN },
  ipas: { 5: TOPIK_IPAS_K5, 6: TOPIK_IPAS_K6 },
  bahasa_inggris: { 5: TOPIK_BAHASA_INGGRIS_K5, 6: TOPIK_BAHASA_INGGRIS_K6 },
  matematika: { 5: TOPIK_MATEMATIKA_K5, 6: TOPIK_MATEMATIKA_K6 }
}

export function getTopicsForGenerate(
  subject: ExamSubject,
  grade: GenerateGrade | null | undefined
): ReadonlyArray<string> {
  if (grade === undefined || grade === null) {
    return []
  }
  return TOPICS_BY_SUBJECT_AND_GRADE[subject][grade]
}

/** @deprecated Use getTopicsForGenerate(subject, grade) for grade-aware topik. */
export const TOPICS_BY_SUBJECT: Record<ExamSubject, ReadonlyArray<string>> = {
  bahasa_indonesia: TOPIK_BI,
  pendidikan_pancasila: TOPIK_PPKN,
  ipas: [...TOPIK_IPAS_K5, ...TOPIK_IPAS_K6],
  bahasa_inggris: [...TOPIK_BAHASA_INGGRIS_K5, ...TOPIK_BAHASA_INGGRIS_K6],
  matematika: [...TOPIK_MATEMATIKA_K5, ...TOPIK_MATEMATIKA_K6]
}
