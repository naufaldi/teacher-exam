# Product Requirements Document (PRD) v6

## School Exam Generator — Weakness Analysis + Re-teach

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Product Name**  | School Exam Generator (Ujian SD)                                       |
| **Version**       | 6.0 — Weakness Analysis + Re-teach                                     |
| **Date**          | 2026-04-29                                                             |
| **Status**        | Draft                                                                  |
| **Baseline**      | PRD v5 (2026-10-15) — menambah analisis kelemahan setelah koreksi depth |
| **Target Launch** | 2026-11-30                                                             |
| **Scope**         | Dashboard kelemahan, insight per soal, saran re-teach, link buku       |

---

## 1. Problem

PRD v5 mengirim fitur **Correction Depth**: data koreksi persisten, item analysis (per soal: % benar, % salah per opsi), class comparison, export, dan tren historis. Guru sekarang tahu **angka**-nya — soal mana yang sulit, kelas mana yang lemah.

Tapi ada gap besar antara **tahu angka** dan **tahu harus berbuat apa**:

- **Guru tahu "80% salah di soal nomor 5" tapi tidak tahu kenapa.** Apakah soalnya ambigu? Apakah materinya belum diajarkan? Apakah ada miskonsepsi umum?
- **Guru tidak tahu topik mana yang lemah.** Item analysis per soal tidak mengelompokkan berdasarkan topik kurikulum. Guru harus manual menghubungkan soal → topik → materi.
- **Guru tidak tahu apa yang harus di-re-teach.** Setelah koreksi 30 lembar, guru punya skor tapi tidak ada rekomendasi: "Topik X perlu diajarkan ulang."
- **Guru tidak tahu di mana materinya.** Bahkan jika tahu topik lemah, guru harus manual mencari di buku siswa halaman mana yang relevan.
- **Tidak ada laporan untuk orang tua/kepala sekolah.** Guru ingin menyampaikan "kelas ini lemah di topik X" tapi tidak punya format yang rapi.

PRD v6 mengatasi gap ini: dari **angka** ke **insight** ke **aksi**.

---

## 2. Solution

### 2.1 Ringkasan

| Fitur | Deskripsi |
|-------|-----------|
| **Weakness Dashboard** | Visual: topik mana yang siswa paling lemah setelah koreksi. |
| **Question-Level Insight** | Per soal: % benar, alasan salah, hubungan dengan topik. |
| **Topic Clustering** | Kelompokkan soal lemah berdasarkan topik kurikulum. |
| **Re-teach Suggestions** | AI-generated: "Re-teach: Ide Pokok, Gagasan Utama" + alasan. |
| **Book Reference Linking** | Link topik lemah ke bab spesifik di Buku Siswa. |
| **Print Report** | Ringkasan satu halaman untuk orang tua/kepala sekolah. |

### 2.2 Weakness Dashboard

**Tampilan:**
- Route: `/weakness-analysis` (diakses dari halaman Koreksi atau Riwayat)
- Ringkasan: "Kelas 6 - TKA Bahasa Indonesia - 30 murid"
- Top 3 topik terlemah: kartu besar dengan % benar
- Chart: bar chart semua topik dengan % benar
- Daftar soal per topik (expandable)

**Data:**
- Diambil dari data koreksi persisten (PRD v5)
- Minimal 5 murid sudah dikoreksi sebelum dashboard muncul
- Topik diambil dari field `topic` di soal (sudah ada di database)

### 2.3 Question-Level Insight

**Per soal:**
- % benar (misal: 40% murid benar)
- Jawaban yang dipilih murid (distribusi A/B/C/D)
- Topik soal
- Kesulitan soal
- **Insight teks:** "Soal ini sulit karena 60% murid memilih B, padahal jawaban benar C. Kemungkinan ada miskonsepsi tentang perbedaan opini dan fakta."

**Tampilan:**
- Expandable card per soal
- Chart kecil: pie chart distribusi jawaban
- Teks insight di bawah chart

### 2.4 Topic Clustering

**Alur:**
1. Sistem mengambil semua soal yang sudah dikoreksi
2. Kelompokkan berdasarkan field `topic` (sudah ada di database)
3. Hitung rata-rata % benar per topik
4. Urutkan dari terlemah ke terkuat
5. Tampilkan di dashboard

**Contoh output:**
```
Topik Terlemah:
1. Ide Pokok Paragraf — 35% benar
2. Menentukan Gagasan Utama — 42% benar
3. Perbedaan Opini dan Fakta — 55% benar
4. Kosakata Bermakna Konotatif — 78% benar
5. Menulis Surat Resmi — 85% benar
```

### 2.5 Re-teach Suggestions

**Alur:**
1. Sistem mengambil topik terlemah (top 3)
2. Kirim ke AI: "Berdasarkan hasil koreksi, siswa lemah di topik: [list]. Berikan saran untuk mengajar ulang topik-topik ini."
3. AI menghasilkan:
   - Topik yang perlu di-re-teach
   - Alasan mengapa siswa lemah (berdasarkan distractor analysis)
   - Strategi mengajar: pendekatan, contoh, aktivitas
   - Referensi ke Buku Siswa (jika tersedia)

**Contoh output:**
```
Saran Re-teach:

1. Ide Pokok Paragraf (35% benar)
   - Alasan: Siswa kesulitan membedakan ide pokok dan ide pendukung
   - Strategi: Gunakan teknik "Satu Kalimat" — siswa diminta merangkum paragraf dalam satu kalimat
   - Buku Siswa: Hal. 12-15, Bab 1 "Aku Anak Indonesia"

2. Perbedaan Opini dan Fakta (55% benar)
   - Alasan: 40% siswa menganggap opini sebagai fakta
   - Strategi: Latihan "Benar atau Pendapat?" — berikan 10 kalimat, siswa tentukan fakta/opini
   - Buku Siswa: Hal. 45-48, Bab 3 "Situs Warisan Dunia"
```

### 2.6 Book Reference Linking

**Alur:**
1. Sistem mengambil topik terlemah
2. Cari di korpus Buku Siswa (markdown di `apps/api/src/curriculum/md/`) bab yang relevan dengan topik
3. Tampilkan: nama bab, halaman (jika tersedia), ringkasan materi

**Fallback:**
- Jika korpus tidak tersedia → tampilkan "Referensi buku tidak tersedia"
- Jika topik tidak cocok dengan bab manapun → tampilkan "Topik tidak ditemukan di Buku Siswa"

### 2.7 Print Report

**Fitur:**
- Tombol "Cetak Laporan" di halaman Weakness Dashboard
- Format: satu halaman A4
- Isi:
  - Header: nama ujian, mapel, kelas, tanggal, jumlah murid
  - Topik terlemah (top 3) dengan % benar
  - Saran re-teach (ringkas)
  - Daftar soal yang perlu diperbaiki (jika % benar <50%)
  - Rekomendasi untuk orang tua/kepala sekolah

**Tujuan:**
- Guru bisa cetak dan berikan ke orang tua: "Anak Anda lemah di topik X"
- Guru bisa cetak untuk kepala sekolah: "Kelas ini perlu remedial di topik X"

---

## 3. User Stories

Penomoran melanjutkan konvensi PRD v2–v5; prefix `WA` = Weakness Analysis.

### US-WA-1: Lihat dashboard kelemahan setelah koreksi

> **Sebagai** guru yang sudah mengoreksi ujian, **saya ingin** melihat topik mana yang siswa paling lemah **agar** tahu materi mana yang perlu diajarkan ulang.

**Acceptance Criteria:**
- Tombol "Analisis Kelemahan" muncul di halaman Koreksi setelah ≥5 murid dikoreksi
- Klik → masuk ke halaman Weakness Dashboard
- Menampilkan: top 3 topik terlemah, chart semua topik, daftar soal per topik
- Data real-time: setelah koreksi murid baru, dashboard ter-update

### US-WA-2: Lihat insight per soal

> **Sebagai** guru, **saya ingin** tahu mengapa soal tertentu sulit **agar** bisa memperbaiki soal atau mengajar ulang materi.

**Acceptance Criteria:**
- Expandable card per soal di dashboard
- Menampilkan: % benar, distribusi jawaban (pie chart), topik, kesulitan
- Insight teks: "60% memilih B, padahal jawaban C. Kemungkinan miskonsepsi tentang X."
- Minimal 5 murid dikoreksi sebelum insight muncul

### US-WA-3: Lihat ringkasan topik terlemah

> **Sebagai** guru, **saya ingin** melihat daftar topik dari terlemah ke terkuat **agar** bisa memprioritaskan materi yang perlu di-re-teach.

**Acceptance Criteria:**
- Tabel di dashboard: topik, % benar, jumlah soal, jumlah murid
- Urutan: dari terlemah ke terkuat
- Highlight topik dengan % benar <50% (merah)
- Klik topik → expand daftar soal di topik tersebut

### US-WA-4: Dapat saran re-teach dari AI

> **Sebagai** guru, **saya ingin** mendapat saran dari AI tentang cara mengajar ulang topik yang lemah **agar** tidak bingung harus mulai dari mana.

**Acceptance Criteria:**
- Tombol "Dapatkan Saran Re-teach" di dashboard
- Klik → AI menghasilkan saran untuk top 3 topik terlemah
- Saran berisi: alasan siswa lemah, strategi mengajar, aktivitas
- Loading state: progress indicator selama AI memproses
- Error handling: tampilkan pesan jika AI gagal

### US-WA-5: Lihat referensi Buku Siswa

> **Sebagai** guru, **saya ingin** tahu di halaman berapa materi yang perlu di-re-teach **agar** bisa langsung membuka buku dan mengajar.

**Acceptance Criteria:**
- Di setiap saran re-teach, tampilkan referensi Buku Siswa
- Format: nama bab, halaman (jika tersedia), ringkasan materi
- Link ke korpus Buku Siswa (jika tersedia)
- Fallback: "Referensi tidak tersedia" jika korpus tidak ada

### US-WA-6: Cetak laporan kelemahan

> **Sebagai** guru, **saya ingin** mencetak laporan kelemahan kelas **agar** bisa berikan ke orang tua atau kepala sekolah.

**Acceptance Criteria:**
- Tombol "Cetak Laporan" di dashboard
- Format: satu halaman A4
- Isi: header ujian, topik terlemah, saran re-teach, rekomendasi
- Print preview sebelum cetak
- Elemen non-cetak disembunyikan (navbar, tombol, footer)

---

## 4. Definition of Done

PRD v6 rilis hanya saat **semua** item DoD berikut terpenuhi.

### 4.1 AI Prompt

- [ ] Prompt untuk re-teach suggestions: input = topik terlemah + distractor analysis; output = alasan + strategi + aktivitas
- [ ] Prompt di-test dengan 10 sampel: ≥8 menghasilkan saran yang relevan dan actionable
- [ ] Fallback: jika AI gagal → tampilkan "Saran tidak tersedia"

### 4.2 UI

- [ ] Route `/weakness-analysis` — dashboard kelemahan
- [ ] Question-level insight: expandable card per soal
- [ ] Topic clustering: tabel topik dari terlemah ke terkuat
- [ ] Re-teach suggestions: tombol + loading + hasil
- [ ] Book reference linking: tampilkan referensi Buku Siswa
- [ ] Print report: satu halaman A4, layout rapi
- [ ] Responsive: desktop-first, basic tablet support

### 4.3 Integration

- [ ] Integrasi dengan data koreksi persisten (PRD v5)
- [ ] Integrasi dengan korpus Buku Siswa (existing di `apps/api/src/curriculum/md/`)
- [ ] Real-time update: dashboard ter-update setelah koreksi murid baru

### 4.4 Browser Verification

- [ ] Koreksi ≥5 murid → dashboard muncul → topik terlemah tampil
- [ ] Expand soal → insight muncul
- [ ] Klik "Dapatkan Saran" → AI menghasilkan saran
- [ ] Referensi Buku Siswa tampil
- [ ] Cetak laporan → print preview bersih
- [ ] Tidak ada console error/warning

---

## 5. Success Metrics

Diukur 30 hari setelah rilis ke produksi.

| Metrik | Target | Cara Ukur |
|--------|--------|-----------|
| Dashboard views (% guru yang cek setelah koreksi) | ≥15% | Analytics |
| Re-teach suggestion usage (% guru yang minta saran) | ≥10% | Analytics AI endpoint |
| Print report usage (% guru yang cetak laporan) | ≥10% | Analytics print |
| Book reference clicks (% guru yang klik referensi) | ≥8% | Analytics |
| Guru satisfaction (1–5, sample 10 guru) | ≥4.2 | Survey |

---

## 6. Out of Scope

Eksplisit **tidak** dikerjakan dalam PRD v6:

- **Remedial tracking** — tidak ada fitur untuk melacak apakah guru sudah melakukan re-teach dan hasilnya
- **Student-facing dashboard** — murid tidak melihat dashboard ini; hanya guru
- **AI-generated remedial materials** — AI hanya memberi saran, tidak membuat materi remedial
- **Parent notification** — tidak ada notifikasi otomatis ke orang tua
- **School-level aggregation** — dashboard milik individu guru, bukan agregat sekolah
- **Predictive analytics** — tidak ada prediksi "siswa X akan gagal di ujian berikutnya"
- **Integration with external assessment tools** — tidak ada integrasi dengan asesmen nasional/lainnya

---

## 7. Risks & Open Questions

| # | Risiko | Mitigasi |
| - | ------ | -------- |
| 1 | Topik di soal tidak akurat → clustering salah | Validasi topik saat generate; guru bisa edit topik di review |
| 2 | AI re-teach suggestions terlalu generic | Ground prompt dengan distractor analysis + referensi buku spesifik |
| 3 | Terlalu sedikit murid (<5) → insight tidak berguna | Minimum threshold 5 murid sebelum dashboard muncul |
| 4 | Korpus Buku Siswa tidak lengkap → referensi tidak tersedia | Fallback: "Referensi tidak tersedia"; guru bisa manual |
| 5 | Print report terlalu panjang (>1 halaman) | Compress: top 3 topik saja, bukan semua topik |

---

## 8. Approval

PRD ini dianggap **approved** saat:

- 1 guru SD reviewer menandatangani user stories sebagai realistis.
- 1 lead developer menandatangani DoD sebagai dapat dikerjakan.
- Stakeholder produk menandatangani target launch dan success metrics.

Tanda tangan tercatat sebagai komentar di PR yang menambahkan dokumen ini.
