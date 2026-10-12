import { PageHeader } from "@teacher-exam/ui"
import { PublicPageShell } from "../layout/public-page-shell.js"

const privacySections = [
  {
    id: "collected",
    heading: "Data yang dikumpulkan",
    paragraphs: [
      "Ujian Sekolah menyimpan nama, email, foto profil, dan nama pengguna dari akun yang dipakai untuk masuk. Akun itu bisa akun Google atau akun dev.",
      "Aplikasi juga menyimpan profil guru. Profil itu dapat berisi sekolah, alamat sekolah, logo sekolah, kelas yang diampu, dan mata pelajaran yang diampu.",
      "Aplikasi menyimpan ujian yang dibuat, soal di dalam ujian, dan berkas PDF yang diunggah.",
      "Jika guru mengisi kelas, aplikasi menyimpan nama kelas, nama siswa, dan nomor identitas siswa yang guru masukkan.",
      "Cookie sesi menyimpan status masuk. Sesi juga menyimpan alamat IP dan identitas peramban. Cookie itu ada selama guru masih masuk."
    ]
  },
  {
    id: "purpose",
    heading: "Tujuan pemrosesan",
    paragraphs: [
      "Data akun dipakai untuk membuat akun guru dan menjaga sesi masuk.",
      "Teks soal, berkas PDF, dan data kelas dipakai untuk menyusun, menyimpan, dan mencetak ujian.",
      "Laporan kesalahan dipakai untuk mencari gangguan pada aplikasi ketika pemantauan kesalahan dinyalakan."
    ]
  },
  {
    id: "retention",
    heading: "Jangka waktu penyimpanan",
    paragraphs: [
      "Cookie sesi ada selama guru masih masuk. Sesi berakhir pada waktu kedaluwarsa sesi.",
      "[PLACEHOLDER] jangka waktu penyimpanan akun dan profil guru belum ditetapkan.",
      "[PLACEHOLDER] jangka waktu penyimpanan ujian, soal, dan berkas PDF belum ditetapkan.",
      "[PLACEHOLDER] jangka waktu penyimpanan laporan kesalahan di Sentry belum ditetapkan."
    ]
  },
  {
    id: "deletion",
    heading: "Permintaan penghapusan",
    paragraphs: [
      "Menghapus akun menghapus data tersebut.",
      "Guru yang sudah masuk membuka halaman Akun, mengetik HAPUS, lalu mengirim permintaan hapus.",
      "Guru yang tidak bisa masuk dapat mengirim permintaan penghapusan ke kontak di bagian Kontak."
    ]
  },
  {
    id: "contact",
    heading: "Kontak",
    paragraphs: [
      "[PLACEHOLDER] alamat email kontak privasi belum ditetapkan.",
      "Kirim permintaan akses, perbaikan, atau penghapusan data pribadi ke alamat itu."
    ]
  },
  {
    id: "processors",
    heading: "Pihak ketiga",
    paragraphs: [
      "Masuk memakai Google. Google menerima permintaan masuk dan mengirim nama, email, dan foto profil.",
      "Ujian Sekolah mengirim teks soal dan berkas PDF ke penyedia AI yang sedang dipakai. Penyedia itu adalah Anthropic, OpenAI, atau MiniMax.",
      "Sentry menerima laporan kesalahan dan nama tahap pemakaian ketika pemantauan kesalahan dinyalakan."
    ]
  }
] as const

function PrivacyNoticePage() {
  return (
    <PublicPageShell>
      <PageHeader title="Kebijakan privasi" subtitle="Ujian Sekolah" />
      <div className="flex max-w-2xl flex-col gap-8 text-body text-text-secondary">
        <p>
          Kebijakan ini menjelaskan data pribadi yang Ujian Sekolah memproses menurut UU Perlindungan Data Pribadi.
        </p>
        {privacySections.map((section) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold text-text-primary">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </div>
    </PublicPageShell>
  )
}

export { PrivacyNoticePage }
