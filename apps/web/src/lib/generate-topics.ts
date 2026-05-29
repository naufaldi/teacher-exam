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

const TOPIK_IPAS = [
  "Cahaya dan Bunyi",
  "Ekosistem dan Rantai Makanan",
  "Magnet dan Listrik Sederhana",
  "Siklus Air dan Perubahan Bumi",
  "Sumber Daya Alam Indonesia",
  "Tubuh Manusia dan Kesehatan",
  "Energi dan Perubahannya",
  "Bumi, Bulan, Matahari, dan Tata Surya"
] as const

const TOPIK_MATEMATIKA = [
  "Bilangan Cacah dan Operasi Hitung",
  "Pecahan, Desimal, dan Persen",
  "Pola dan Kalimat Matematika",
  "Pengukuran",
  "Data dan Peluang Awal",
  "Bangun Datar",
  "Bangun Ruang",
  "Bidang Koordinat"
] as const

const TOPIK_BAHASA_INGGRIS = [
  "Daily Activities",
  "At School",
  "Food and Drinks",
  "My House and My Room",
  "Animals Around Us",
  "Things We Wear",
  "Past Experiences",
  "Directions and Public Places",
  "Stories and Moral Lessons",
  "Health and Safety",
  "Future Plans and Invitations"
] as const

export const TOPICS_BY_SUBJECT: Record<ExamSubject, ReadonlyArray<string>> = {
  bahasa_indonesia: TOPIK_BI,
  pendidikan_pancasila: TOPIK_PPKN,
  ipas: TOPIK_IPAS,
  bahasa_inggris: TOPIK_BAHASA_INGGRIS,
  matematika: TOPIK_MATEMATIKA
}
