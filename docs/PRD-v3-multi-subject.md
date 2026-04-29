# Product Requirements Document (PRD) v3

## School Exam Generator — Ekspansi Multi-Mata Pelajaran

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Product Name**  | School Exam Generator (Ujian SD)                                       |
| **Version**       | 3.0 — Multi-Mapel Expansion                                            |
| **Date**          | 2026-04-29                                                             |
| **Status**        | Draft                                                                  |
| **Baseline**      | PRD v2 (2026-04-22) — menambah cakupan mapel, tidak mengubah alur inti |
| **Target Launch** | Fase 1: 2026-05-15 · Fase 2: 2026-06-15 · Fase 3: 2026-07-31           |
| **Scope**         | Tambah IPAS, Bahasa Inggris, Matematika ke generator Fase C            |

---

## 1. Problem

PRD v2 mengirim produk dengan dua mapel: **Bahasa Indonesia** dan **Pendidikan Pancasila**. Realitas mengajar SD kelas 5–6 di Kurikulum Merdeka Fase C mencakup minimal **5 mapel akademik utama**: Bahasa Indonesia, PPKn, IPAS, Bahasa Inggris, dan Matematika.

Akibat keterbatasan v2:

- **Cakupan rendah** — guru harus tetap menyusun manual untuk 3 dari 5 mapel akademik; produk tidak bisa menjadi alat sehari-hari.
- **Hilangnya kepercayaan** — guru yang sukses dengan B. Indonesia/PPKn berekspektasi cakupan penuh. Saat sistem "tidak punya mapel saya," produk dianggap belum siap.
- **Adopsi terbatas pada 1–2 guru per sekolah** — guru kelas yang mengampu seluruh mapel kelas tidak terlayani; hanya guru bidang B. Indonesia/PPKn yang mendapat manfaat penuh.
- **Khusus Matematika** — sekadar menambah enum mapel tidak cukup. Tanpa dukungan notasi matematika (pecahan, eksponen, akar) dan diagram bangun datar, output AI tidak setara kualitas soal cetakan guru. Risiko: produk dianggap "tidak serius untuk Matematika."

PRD v3 mengatasi tiga keterbatasan ini sekaligus: cakupan, kualitas Matematika, dan urutan rilis yang tidak menahan mapel mudah karena menunggu yang sulit.

---

## 2. Solution

Tambah 3 mapel baru ke pipeline yang ada — **dirilis dalam 3 fase berurutan**, masing-masing punya nilai sendiri dan dapat di-ship independen.

### 2.1 Ringkasan Fase

| Fase | Cakupan                                          | Kompleksitas | Ketergantungan baru                    |
| ---- | ------------------------------------------------ | ------------ | -------------------------------------- |
| 1    | IPAS + Bahasa Inggris (text-only)                | Rendah       | 4 file korpus markdown Fase C          |
| 2    | Matematika dengan KaTeX (tanpa diagram)          | Sedang       | KaTeX di web + PDF; 2 file korpus mtk  |
| 3    | Diagram geometri Matematika (lingkaran, persegi) | Tinggi       | Skema `figure_spec` + renderer SVG/PDF |

### 2.2 Fase 1 — IPAS + Bahasa Inggris

Penambahan mekanis ke pipeline existing: dua mapel ini cocok 100% dengan model soal pilihan ganda berbasis teks yang sudah berjalan untuk B. Indonesia.

- Tambah enum `exam_subject`: `ipas`, `bahasa_inggris`.
- Tambah korpus Buku Siswa Kurikulum Merdeka Fase C: `ipas-kelas-5.md`, `ipas-kelas-6.md`, `bahasa-inggris-kelas-5.md`, `bahasa-inggris-kelas-6.md`.
- Tambah daftar topik per mapel di form Generate (mengacu bab buku siswa, ≥6 topik per mapel).
- Update label/metadata UI: filter Riwayat, Profil, Onboarding, kartu preview.
- Prompt AI **tidak berubah** — sudah subject-agnostic via variabel `subjectLabel` + `curriculumText`.

Soal Bahasa Inggris: stem dan opsi jawaban dalam Bahasa Inggris; pembahasan dalam Bahasa Indonesia (mengikuti norma guru di kelas).

### 2.3 Fase 2 — Matematika dengan KaTeX

- Tambah enum `matematika`; tambah korpus `matematika-kelas-5.md`, `matematika-kelas-6.md`.
- Pasang **KaTeX** untuk render notasi matematika di:
  - Kartu soal (web)
  - Pembahasan (web)
  - Lembar soal cetak (PDF export)
  - Lembar jawaban cetak (PDF export)
- AI prompt diperbarui: ekspresi matematika **wajib** dalam delimiter LaTeX — `$inline$` dan `$$display$$`. Plain-text math (mis. `1/2`) ditolak validator.
- Validator skema baru di output AI: tiap field teks soal & opsi diparse KaTeX; gagal parse → retry generate (maks 2x), sebelum fallback ke skip soal.
- **Topik bergambar disembunyikan** di Fase 2: Bangun Datar, Bangun Ruang, Bidang Koordinat. Akan dibuka di Fase 3.

### 2.4 Fase 3 — Diagram Geometri Matematika

Pendekatan **figure spec terstruktur** (bukan AI-emit raw SVG, karena LLM tidak reliabel menggambar SVG):

1. AI mengeluarkan field `figure` (opsional) per soal — JSON dengan tipe + parameter, mis. `{ "type": "circle", "radius": 7, "label": "r = 7 cm" }`.
2. Server-side **deterministic renderer** mengubah figure spec → SVG inline (web) + path PDF (cetak). Output identik di kedua media.
3. Schema figure terbatas pada bentuk dasar Fase C: lingkaran, persegi, persegi panjang, segitiga, trapesium, bidang koordinat. Figure di luar daftar → validator tolak → AI regen tanpa figure atau dengan topik alternatif.
4. Topik yang sebelumnya disembunyikan di Fase 2 dibuka kembali.

Mapel di-flag `available` per-fase di enum; Matematika baru muncul di UI saat Fase 2 diterima. Topik diagram baru muncul di UI saat Fase 3 diterima.

---

## 3. User Stories

Penomoran melanjutkan konvensi PRD v2 (`US-*`); prefix `MS` = Multi-Subject.

- **US-MS-1 (Fase 1) — Generate IPAS.**
  Sebagai guru kelas 5 yang mengajar IPAS, saya ingin memilih "IPAS" di form Generate dan mendapatkan 20 soal pilihan ganda selaras CP Fase C, sehingga saya tidak perlu menyusun manual.

- **US-MS-2 (Fase 1) — Generate Bahasa Inggris.**
  Sebagai guru Bahasa Inggris kelas 6, saya ingin memilih topik (Reading, Vocabulary, Grammar, Listening Script) dan mendapatkan soal yang sesuai CP, dengan stem dan opsi jawaban dalam Bahasa Inggris.

- **US-MS-3 (Fase 2) — Notasi Matematika tampil benar.**
  Sebagai guru Matematika, saya ingin soal yang memuat pecahan ($\frac{3}{4}$), eksponen ($x^2$), dan akar ($\sqrt{16}$) tampil benar di layar dan cetakan PDF, sehingga lembar siap dibagikan ke siswa tanpa edit manual.

- **US-MS-4 (Fase 3) — Soal dengan diagram.**
  Sebagai guru Matematika, saya ingin soal "luas lingkaran dengan jari-jari 7 cm" disertai gambar lingkaran berlabel `r = 7 cm`, sehingga siswa memahami soal tanpa saya menggambar ulang.

- **US-MS-5 (Lintas fase) — Filter & profil ikut beradaptasi.**
  Sebagai guru, saya ingin filter Riwayat menampilkan mapel baru dan onboarding/profil membiarkan saya memilih mapel yang saya ajar dari daftar lengkap, sehingga ujian lama tetap terdaftar dan preferensi saya akurat.

- **US-MS-6 (Lintas fase) — Mapel yang belum siap tidak muncul.**
  Sebagai guru, saya ingin hanya melihat mapel yang sudah benar-benar siap di form Generate (mis. Matematika tidak muncul sebelum Fase 2 rilis), sehingga saya tidak salah pilih dan menerima output yang belum teruji.

---

## 4. Definition of Done

Setiap fase rilis hanya saat **semua** item DoD berikut terpenuhi.

### 4.1 Fase 1 DoD — IPAS + Bahasa Inggris

- [ ] Korpus markdown Fase C ada untuk: IPAS-5, IPAS-6, Bahasa-Inggris-5, Bahasa-Inggris-6 — di-review oleh ≥1 guru SD reviewer.
- [ ] Enum DB (`exam_subject`) + Effect Schema literal + UI option arrays diperbarui; migrasi Drizzle merged ke `main`.
- [ ] Daftar topik per mapel ≥6 topik, mengacu bab buku siswa Kemendikdasmen.
- [ ] **50 sampel soal per kombinasi mapel × kelas** di-generate (= 200 soal total) dan di-review guru: ≥90% lolos tanpa edit berat.
- [ ] Filter Riwayat, Profil, Onboarding mendukung mapel baru tanpa regresi tes Vitest.
- [ ] Browser verification (per `CLAUDE.md`): generate → preview → cetak → koreksi untuk IPAS dan B. Inggris berjalan tanpa error/warning console.

### 4.2 Fase 2 DoD — Matematika dengan KaTeX

- [ ] Korpus Matematika Fase C kelas 5 dan 6 di-review guru.
- [ ] KaTeX terpasang di: kartu soal, pembahasan, preview cetak (web), dan PDF export. Output identik secara visual di kedua media.
- [ ] Validator menolak respons AI dengan LaTeX gagal parse; auto-retry berhasil ≥95% pada 200 sampel.
- [ ] **50 sampel soal Matematika tanpa diagram** di-review: ≥95% LaTeX render benar di layar dan PDF, ≥90% lolos tanpa edit berat.
- [ ] Topik bergambar (Bangun Datar, Bangun Ruang, Bidang Koordinat) **disembunyikan** di UI dan tidak bisa di-generate.
- [ ] Browser verification: generate Matematika non-diagram → preview → PDF cetak bersih.

### 4.3 Fase 3 DoD — Diagram Geometri

- [ ] Skema `figure_spec` final di `packages/shared`: tipe `circle`, `square`, `rectangle`, `triangle`, `trapezoid`, `coordinate_plane`.
- [ ] Renderer deterministik server-side menghasilkan SVG identik di web dan PDF (visual diff < 1 px).
- [ ] **50 soal bergambar** di-review guru: ≥95% gambar sesuai deskripsi soal (label, ukuran, orientasi).
- [ ] Validator menolak figure spec di luar daftar pendukung; AI regen dengan topik alternatif berhasil ≥90%.
- [ ] Topik bergambar yang disembunyikan di Fase 2 dibuka kembali di UI.
- [ ] Browser verification: soal "luas lingkaran" dan "luas persegi panjang" generate → render web → cetak PDF bersih.

---

## 5. Success Metrics

Diukur 30 hari setelah tiap fase rilis ke produksi.

| Metrik                                              | Fase 1 target              | Fase 2 target | Fase 3 target                        |
| --------------------------------------------------- | -------------------------- | ------------- | ------------------------------------ |
| Adopsi mapel baru (% guru aktif yang generate ≥1×)  | IPAS 40%, B. Inggris 25%   | Mtk 30%       | Mtk diagram 60% dari pengguna mtk    |
| Tingkat sukses generate (tanpa retry manual guru)   | ≥90%                       | ≥85%          | ≥80%                                 |
| Kepuasan guru reviewer (skor 1–5, sample 10 guru)   | ≥4.0                       | ≥4.0          | ≥4.2                                 |
| Error rate render (KaTeX/figure gagal di klien)     | n/a                        | <2%           | <3%                                  |
| Keluhan kualitas figure (laporan per 100 soal cetak)| n/a                        | n/a           | <5                                   |

Kalibrasi target: angka di atas adalah **hipotesis awal**; threshold final ditetapkan setelah pilot 1 minggu pertama tiap fase.

---

## 6. Out of Scope

Eksplisit **tidak** dikerjakan dalam PRD v3:

- Mapel non-akademik Fase C: Pendidikan Agama dan Budi Pekerti (multi-religi), PJOK, Seni & Budaya, Muatan Lokal.
- Diagram Matematika di luar 6 bentuk dasar: grafik fungsi, diagram batang/lingkaran statistik, peta, jaring-jaring bangun ruang 3D.
- Kurikulum di luar Fase C: TK, SD kelas 1–4, SMP, SMA.
- Jenis soal di luar pilihan ganda untuk Matematika (esai bertingkat, soal "tunjukkan langkah"). Mengikuti PRD v2.
- Konten non-Indonesia/Inggris: tidak ada bahasa daerah/asing lain.
- Auto-grading soal Matematika dengan jawaban numerik bertoleransi (mis. "0.33 ≈ 1/3"). Koreksi tetap mengandalkan kunci jawaban tekstual seperti PRD v2.

---

## 7. Risks & Open Questions

| # | Risiko                                                                                           | Mitigasi                                                                   |
| - | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1 | Korpus Buku Siswa untuk IPAS/B. Inggris/Mtk Fase C belum diverifikasi ketersediaan & kualitasnya | Spike sourcing 1 hari sebelum Fase 1; fallback ke korpus CP/ATP jika gagal |
| 2 | Reliabilitas LaTeX dari Claude belum diukur; bisa di bawah 95%                                   | Pilot generate 200 soal Mtk early di Fase 2 untuk kalibrasi DoD            |
| 3 | 95% threshold akurasi diagram (Fase 3) bisa tidak realistis                                      | Buka opsi turun ke 90% setelah review pilot 50 sampel pertama              |
| 4 | KaTeX di PDF export bisa butuh rendering server-side berbeda dari web                            | Spike teknis di awal Fase 2 sebelum DoD dikunci                            |
| 5 | `subjects_taught` user (PRD v2) perlu migrasi non-destruktif saat enum diperluas                 | Drizzle: `ALTER TYPE ... ADD VALUE` — non-breaking di PostgreSQL            |
| 6 | Guru memilih Matematika sebelum Fase 2 rilis → crash                                             | Flag `available_at_phase` di config; UI filter berdasarkan flag            |

---

## 8. Approval

PRD ini dianggap **approved** saat:

- 1 guru SD reviewer menandatangani user stories sebagai realistis.
- 1 lead developer menandatangani DoD per fase sebagai dapat dikerjakan.
- Stakeholder produk menandatangani target launch dan success metrics.

Tanda tangan tercatat sebagai komentar di PR yang menambahkan dokumen ini.
