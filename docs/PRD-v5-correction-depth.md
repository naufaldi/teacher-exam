# Product Requirements Document (PRD) v5

## School Exam Generator — Correction Depth

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Product Name**  | School Exam Generator (Ujian SD)                                       |
| **Version**       | 5.0 — Correction Depth                                                 |
| **Date**          | 2026-04-29                                                             |
| **Status**        | Draft                                                                  |
| **Baseline**      | PRD v4 (2026-08-31) — menambah kedalaman koreksi setelah bank soal     |
| **Target Launch** | 2026-10-15                                                             |
| **Scope**         | Koreksi persisten, batch import, analisis butir soal, export           |

---

## 1. Problem

PRD v2 mengirim fitur **Koreksi Cepat** (US-19/20): guru memasukkan jawaban murid satu per satu, skor dihitung secara real-time, dan rekap kelas ditampilkan. Fitur ini berfungsi, tapi punya keterbatasan:

- **Data hilang saat halaman ditutup.** Koreksi berjalan di React state (in-memory). Guru menutup tab → semua skor 20+ murid hilang. Harus mengulang dari awal.
- **Tidak ada batch import.** Guru harus klik A/B/C/D satu per satu untuk setiap murid. Untuk 30 murid × 20 soal = 600 klik. Lambat.
- **Tidak ada analisis per soal.** Guru tahu "Budi nilai 70" tapi tidak tahu "soal nomor 5 dijawab salah oleh 80% murid." Tidak ada insight untuk perbaikan soal.
- **Tidak ada perbandingan kelas.** Guru yang mengajar 3 kelas tidak bisa membandingkan performa kelas A vs B vs C.
- **Tidak ada export.** Guru tidak bisa mengunduh rekap ke Excel untuk pelaporan ke kepala sekolah atau orang tua.
- **Tidak ada tren historis.** Guru tidak tahu apakah nilai siswa membaik atau memburuk dari ujian ke ujian.

PRD v5 mengatasi semua keterbatasan ini: data persisten, batch import, analisis butir soal, perbandingan kelas, export, dan tren historis.

---

## 2. Solution

### 2.1 Ringkasan

| Fitur | Deskripsi |
|-------|-----------|
| **Koreksi Persisten** | Simpan hasil koreksi ke database. Load kembali kapan saja. |
| **Batch Import** | Upload CSV/Excel jawaban murid → bulk scoring. |
| **Item Analysis** | Per soal: % benar, % salah per opsi (distractor analysis). |
| **Class Comparison** | Bandingkan skor antar kelas untuk ujian yang sama. |
| **Export CSV** | Download rekap kelas ke CSV/Excel. |
| **Historical Trends** | Track skor siswa dari ujian ke ujian. |

### 2.2 Koreksi Persisten

**Database:**
- `correction_sessions`: id, exam_id, user_id, created_at, updated_at
- `student_answers`: id, session_id, student_name, student_number, question_number, selected_answer, is_correct, created_at

**Alur:**
1. Guru masuk ke halaman Koreksi (dari Riwayat atau dari Preview)
2. Koreksi seperti biasa: klik A/B/C/D per soal
3. Setiap klik otomatis tersimpan ke database (debounced)
4. Guru bisa tutup halaman dan kembali kapan saja → data tetap ada
5. Guru bisa buka koreksi yang sama untuk menambah/mengoreksi murid

**Perubahan dari PRD v2:**
- PRD v2: data di React state, hilang saat tutup halaman
- PRD v5: data di database, persisten

### 2.3 Batch Import

**Alur:**
1. Di halaman Koreksi, tombol "Import dari CSV"
2. Upload CSV dengan format: nama, no_absen, jawaban_1, jawaban_2, ..., jawaban_20
3. Sistem parsing CSV → hitung skor otomatis → tampilkan di rekap
4. Guru bisa edit individual setelah import

**Format CSV:**
```
Nama,No Absen,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20
Budi,1,A,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D
Ani,2,B,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D
```

### 2.4 Item Analysis

**Per soal:**
- % benar (misal: 85% murid menjawab benar)
- % salah per opsi (misal: 10% pilih A, 3% pilih B, 2% pilih C — padahal jawaban D)
- Distractor analysis: opsi mana yang paling banyak menjerat murid

**Tampilan:**
- Tabel per soal: nomor, % benar, % per opsi, topik, kesulitan
- Highlight soal dengan % benar rendah (<50%) — "soal sulit"
- Highlight soal dengan distractor kuat (>20% memilih opsi salah yang sama)

**Mengapa penting:**
- Soal dengan % benar rendah → mungkin terlalu sulit atau ambigu
- Distractor kuat → opsi pengecoh terlalu mirip atau ada miskonsepsi umum

### 2.5 Class Comparison

**Tampilan:**
- Tabel: kelas, rata-rata, median, min, max, % lulus (≥60)
- Chart: bar chart perbandingan rata-rata antar kelas
- Filter: per ujian, per mapel

**Alur:**
1. Guru membuka halaman "Perbandingan Kelas" dari Riwayat
2. Pilih ujian (yang sudah dikoreksi di ≥2 kelas)
3. Tampilkan perbandingan statistik

### 2.6 Export CSV

**Fitur:**
- Tombol "Export CSV" di halaman Rekap
- Format: nama, no_absen, benar, salah, nilai, detail_jawaban
- Buka di Excel/Google Sheets
- Export per kelas atau per ujian

### 2.7 Historical Trends

**Fitur:**
- Per siswa: grafik skor dari ujian ke ujian
- Per kelas: grafik rata-rata dari ujian ke ujian
- Filter: per mapel, per semester

**Tampilan:**
- Line chart: x-axis = ujian (tanggal), y-axis = skor
- Tabel: nama siswa, skor ujian 1, skor ujian 2, skor ujian 3, tren (↑↓→)

---

## 3. User Stories

Penomoran melanjutkan konvensi PRD v2–v3; prefix `CD` = Correction Depth.

### US-CD-1: Simpan sesi koreksi ke database

> **Sebagai** guru, **saya ingin** hasil koreksi tersimpan otomatis **agar** tidak kehilangan data saat menutup halaman.

**Acceptance Criteria:**
- Setiap klik jawaban A/B/C/D → data tersimpan ke database (debounced, max 1 detik)
- Guru tutup halaman → buka kembali → data tetap ada
- Guru bisa melanjutkan koreksi dari titik terakhir
- Loading indicator saat save

### US-CD-2: Load sesi koreksi sebelumnya

> **Sebagai** guru, **saya ingin** membuka koreksi yang sudah pernah saya mulai **agar** bisa melanjutkan atau menambah murid.

**Acceptance Criteria:**
- Dari Riwayat, tombol "Koreksi" membuka sesi yang sudah ada (jika ada)
- Menampilkan rekap murid yang sudah dikoreksi
- Guru bisa menambah murid baru atau mengoreksi murid yang sudah ada
- Opsi "Mulai Koreksi Baru" jika ingin mengulang

### US-CD-3: Import jawaban dari CSV

> **Sebagai** guru, **saya ingin** mengupload jawaban murid dari CSV **agar** tidak perlu klik satu per satu.

**Acceptance Criteria:**
- Tombol "Import CSV" di halaman Koreksi
- Upload CSV dengan format yang ditentukan
- Sistem parsing → hitung skor → tampilkan di rekap
- Error handling: format salah → pesan error yang jelas
- Guru bisa edit individual setelah import
- Template CSV bisa diunduh

### US-CD-4: Lihat analisis per soal (item analysis)

> **Sebagai** guru, **saya ingin** melihat soal mana yang paling banyak dijawab salah **agar** tahu soal mana yang perlu diperbaiki atau materi mana yang belum dipahami murid.

**Acceptance Criteria:**
- Tab "Analisis Soal" di halaman Koreksi
- Tabel per soal: nomor, % benar, % per opsi (A, B, C, D), topik, kesulitan
- Highlight soal dengan % benar <50% (merah)
- Highlight distractor kuat (>20% memilih opsi salah yang sama)
- Minimal 5 murid sudah dikoreksi sebelum analisis muncul

### US-CD-5: Bandingkan performa antar kelas

> **Sebagai** guru yang mengajar beberapa kelas, **saya ingin** membandingkan skor antar kelas **agar** tahu kelas mana yang perlu perhatian lebih.

**Acceptance Criteria:**
- Halaman "Perbandingan Kelas" dari Riwayat
- Pilih ujian yang sudah dikoreksi di ≥2 kelas
- Tabel: kelas, rata-rata, median, min, max, % lulus
- Chart: bar chart perbandingan
- Filter: per mapel, per semester

### US-CD-6: Export rekap ke CSV

> **Sebagai** guru, **saya ingin** mengunduh rekap koreksi ke CSV **agar** bisa melapor ke kepala sekolah atau membuat laporan di Excel.

**Acceptance Criteria:**
- Tombol "Export CSV" di halaman Rekap
- Format: nama, no_absen, benar, salah, nilai, detail_jawaban
- File terunduh otomatis
- Bisa dibuka di Excel/Google Sheets

### US-CD-7: Lihat tren skor siswa

> **Sebagai** guru, **saya ingin** melihat apakah skor siswa membaik atau memburuk dari ujian ke ujian **agar** bisa memantau perkembangan belajar.

**Acceptance Criteria:**
- Per siswa: grafik skor dari ujian ke ujian (line chart)
- Per kelas: grafik rata-rata dari ujian ke ujian
- Tabel: nama, skor ujian 1, skor ujian 2, skor ujian 3, tren (↑↓→)
- Filter: per mapel, per semester
- Minimal 2 ujian sudah dikoreksi sebelum tren muncul

---

## 4. Definition of Done

PRD v5 rilis hanya saat **semua** item DoD berikut terpenuhi.

### 4.1 Database

- [ ] Tabel `correction_sessions`: id, exam_id, user_id, created_at, updated_at
- [ ] Tabel `student_answers`: id, session_id, student_name, student_number, question_number, selected_answer, is_correct, created_at
- [ ] Migrasi Drizzle clean, `pnpm db:migrate` success
- [ ] Index pada exam_id + student_name untuk query cepat

### 4.2 API

- [ ] `POST /api/corrections` — buat/simpan sesi koreksi
- [ ] `GET /api/corrections/:examId` — load sesi koreksi
- [ ] `POST /api/corrections/:examId/import` — import CSV
- [ ] `GET /api/corrections/:examId/analysis` — item analysis
- [ ] `GET /api/corrections/compare` — perbandingan kelas
- [ ] `GET /api/corrections/:examId/export` — export CSV
- [ ] `GET /api/corrections/trends/:studentId` — tren siswa
- [ ] Semua endpoint dilindungi auth middleware
- [ ] Test coverage ≥80% untuk endpoint baru

### 4.3 UI

- [ ] Koreksi persisten: auto-save setiap klik
- [ ] Load sesi koreksi sebelumnya dari Riwayat
- [ ] Import CSV: upload + parsing + error handling
- [ ] Item analysis: tabel per soal dengan highlight
- [ ] Class comparison: tabel + chart
- [ ] Export CSV: tombol + download
- [ ] Historical trends: line chart per siswa dan per kelas
- [ ] Responsive: desktop-first, basic tablet support

### 4.4 Browser Verification

- [ ] Koreksi → tutup halaman → buka kembali → data tetap ada
- [ ] Import CSV → skor terhitung → rekap muncul
- [ ] Item analysis → tabel muncul dengan highlight
- [ ] Export CSV → file terunduh
- [ ] Tidak ada console error/warning

---

## 5. Success Metrics

Diukur 30 hari setelah rilis ke produksi.

| Metrik | Target | Cara Ukur |
|--------|--------|-----------|
| Persistent rekap adoption (% koreksi yang disimpan) | ≥30% | Data correction_sessions |
| CSV import usage (% guru yang import) | ≥10% | Analytics import endpoint |
| Item analysis views (% guru yang cek analisis) | ≥15% | Analytics analysis endpoint |
| Export usage (% guru yang export CSV) | ≥10% | Analytics export endpoint |
| Class comparison usage (% guru yang bandingkan kelas) | ≥5% | Analytics compare endpoint |

---

## 6. Out of Scope

Eksplisit **tidak** dikerjakan dalam PRD v5:

- **OCR jawaban** — tidak ada scan foto lembar jawaban. Input manual atau CSV.
- **Auto-grading esai** — hanya pilihan ganda (mengikuti PRD v2/v3)
- **Notifikasi otomatis** — tidak ada "skor siswa X turun 20 poin"
- **Rekap per sekolah** — rekap milik individu guru, bukan agregat sekolah
- **Integrasi LMS** — tidak ada integrasi dengan Google Classroom, Moodle, dll
- **Analisis butir soal lanjutan** — tidak ada IRT (Item Response Theory), hanya statistik deskriptif

---

## 7. Risks & Open Questions

| # | Risiko | Mitigasi |
| - | ------ | -------- |
| 1 | Migration dari client-side ke server-side bisa breaking | Feature flag: old flow tetap sampai new verified |
| 2 | Large class sizes (40+ murid) → query lambat | Index + pagination pada student_answers |
| 3 | CSV format tidak standar → guru bingung | Template CSV bisa diunduh + contoh format |
| 4 | Item analysis tidak berguna jika <5 murid | Minimum threshold 5 murid sebelum analisis muncul |
| 5 | Historical trends butuh banyak data (≥2 ujian) | Minimum threshold 2 ujian sebelum tren muncul |

---

## 8. Approval

PRD ini dianggap **approved** saat:

- 1 guru SD reviewer menandatangani user stories sebagai realistis.
- 1 lead developer menandatangani DoD sebagai dapat dikerjakan.
- Stakeholder produk menandatangani target launch dan success metrics.

Tanda tangan tercatat sebagai komentar di PR yang menambahkan dokumen ini.
