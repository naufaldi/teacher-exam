# Product Requirements Document (PRD) v4

## School Exam Generator — Bank Soal + Exam Builder

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Product Name**  | School Exam Generator (Ujian SD)                                       |
| **Version**       | 4.0 — Bank Soal + Exam Builder                                         |
| **Date**          | 2026-04-29                                                             |
| **Status**        | Draft                                                                  |
| **Baseline**      | PRD v3 (2026-04-29) — menambah fitur bank soal setelah ekspansi mapel  |
| **Target Launch** | 2026-08-31                                                             |
| **Scope**         | Bank Soal (simpan, browse, share) + Exam Builder (susun dari bank)     |

---

## 1. Problem

PRD v2 dan v3 mengirim produk yang mampu **generate soal dari AI** — guru memilih mapel, topik, dan kesulitan, lalu AI menghasilkan 20 soal siap cetak. Alur ini sudah berjalan untuk 5 mapel akademik Fase C.

Namun ada keterbatasan signifikan:

- **Setiap generate dimulai dari nol.** Guru yang sudah menemukan 10 soal bagus dari generate sebelumnya tidak bisa menyimpan dan menggunakannya lagi. Setiap ujian harus generate ulang.
- **Tidak ada reuse.** Guru PPKN kelas 5 yang sudah membuat soal bagus tentang "Pancasila" harus generate ulang untuk ujian berikutnya, meskipun soal yang sama bisa dipakai.
- **Tidak ada sharing.** Guru di sekolah yang sama tidak bisa berbagi soal. Guru A membuat soal bagus, guru B tidak tahu.
- **Tidak ada komposisi manual.** Guru kadang ingin menggabungkan 5 soal dari generate A + 10 soal dari generate B + 5 soal baru. Tidak ada cara untuk melakukan ini.
- **Wasted effort.** Setelah mereview 20 soal dan menolak 5, soal yang diterima hilang setelah finalize. Guru tidak bisa membangun koleksi dari waktu ke waktu.

PRD v4 mengatasi masalah ini dengan menambahkan **Bank Soal** (simpan, browse, share) dan **Exam Builder** (susun ujian dari bank).

---

## 2. Solution

### 2.1 Ringkasan

Tambah dua fitur utama ke pipeline yang ada:

| Fitur | Deskripsi |
|-------|-----------|
| **Bank Soal** | Simpan soal individu dari hasil generate ke bank persisten. Browse, filter, cari. Toggle public/private. |
| **Exam Builder** | Susun ujian baru dari soal-soal di bank. Pilih → atur → finalize → preview/cetak. |

### 2.2 Bank Soal

**Simpan ke Bank:**
- Dari halaman Review (slow track): tombol "Simpan ke Bank" per soal
- Dari halaman Preview: tombol "Simpan ke Bank" per soal
- Dari halaman Fast Track: tombol "Simpan ke Bank" per soal
- Soal tersimpan beserta metadata: mapel, kelas, topik, kesulitan, tipe soal
- Soal yang disimpan tetap ada di bank meskipun ujian asal dihapus

**Browse Bank:**
- Route baru: `/bank-soal`
- Filter: mapel, kelas, topik, kesulitan, tipe soal, penulis (guru)
- Search: teks soal
- Pagination: 20 soal per halaman
- Sort: terbaru, terpopuler, kesulitan

**Public/Private Toggle:**
- Setiap guru bisa membuat bank-nya visible ke guru lain (read-only)
- Default: private (hanya pemilik yang bisa lihat)
- Public bank bisa dilihat guru lain, tapi tidak bisa diedit
- Guru lain bisa "gunakan" soal dari public bank ke ujian mereka

**Bank Statistics:**
- Jumlah soal di bank per mapel
- Berapa kali soal digunakan di ujian
- Acceptance rate (berapa % soal yang diterima guru saat review)

### 2.3 Exam Builder

**Alur:**
1. Guru masuk ke `/bank-soal`
2. Pilih soal-soal yang ingin digunakan (checkbox)
3. Klik "Buat Ujian dari Pilihan"
4. Masuk ke halaman konfigurasi (seperti Generate, tapi soal sudah dipilih)
5. Atur urutan soal, tambah soal baru jika perlu (opsional: generate AI untuk mengisi kekurangan)
6. Finalize → Preview → Cetak

**Fitur Exam Builder:**
- Pilih minimal 5 soal, maksimal 50 soal
- Atur urutan soal (drag & drop atau nomor)
- Opsi: generate AI untuk mengisi soal yang kurang (jika guru pilih 15 soal, AI bisa tambah 5)
- Metadata lembar sama dengan Generate (sekolah, tahun pelajaran, jenis ujian, dll)
- Preview dan cetak sama dengan Generate

### 2.4 Integrasi dengan Alur Existing

Bank Soal dan Exam Builder **tidak menggantikan** alur Generate yang ada. Keduanya adalah **tambahan**:

- **Generate** (existing): AI membuat 20 soal dari nol → review → preview → cetak
- **Bank Soal** (new): simpan soal dari generate → browse → share
- **Exam Builder** (new): susun ujian dari bank → preview → cetak

Guru bisa menggunakan salah satu atau keduanya.

---

## 3. User Stories

Penomoran melanjutkan konvensi PRD v2 dan v3; prefix `BS` = Bank Soal.

### US-BS-1: Simpan soal ke bank

> **Sebagai** guru, **saya ingin** menyimpan soal yang bagus dari hasil generate ke bank **agar** bisa menggunakannya lagi di ujian berikutnya.

**Acceptance Criteria:**
- Tombol "Simpan ke Bank" muncul di setiap soal (Review, Preview, Fast Track)
- Klik tombol → soal tersimpan ke database dengan metadata lengkap (mapel, kelas, topik, kesulitan, tipe)
- Konfirmasi visual: badge "Tersimpan" atau toast notification
- Soal yang sudah disimpan tidak bisa disimpan lagi (tombol disabled atau badge "Sudah di bank")
- Soal tersimpan tetap ada meskipun ujian asal dihapus

### US-BS-2: Browse bank soal

> **Sebagai** guru, **saya ingin** melihat daftar soal di bank saya **agar** bisa memilih soal untuk ujian berikutnya.

**Acceptance Criteria:**
- Route `/bank-soal` menampilkan daftar soal milik guru
- Filter: mapel, kelas, topik, kesulitan, tipe soal
- Search: teks soal
- Pagination: 20 soal per halaman
- Sort: terbaru, terpopuler, kesulitan
- Setiap soal menampilkan: teks, pilihan, jawaban benar, metadata, kapan disimpan

### US-BS-3: Toggle public/private

> **Sebagai** guru, **saya ingin** membuat bank soal saya visible ke guru lain **agar** mereka bisa menggunakan soal yang sudah saya buat.

**Acceptance Criteria:**
- Toggle di halaman Bank Soal: "Bank Publik" on/off
- Default: off (private)
- Saat on: guru lain bisa melihat soal di bank (read-only)
- Saat off: hanya pemilik yang bisa lihat
- Guru lain tidak bisa mengedit soal di bank publik

### US-BS-4: Bangun ujian dari bank

> **Sebagai** guru, **saya ingin** memilih soal dari bank dan menyusunnya menjadi ujian **agar** tidak perlu generate ulang soal yang sudah bagus.

**Acceptance Criteria:**
- Checkbox di setiap soal di halaman Bank Soal
- Tombol "Buat Ujian dari Pilihan" (aktif jika ≥5 soal dipilih)
- Masuk ke halaman konfigurasi (mirip Generate):
  - Urutan soal (drag & drop)
  - Metadata lembar (sekolah, tahun pelajaran, jenis ujian, dll)
  - Opsi: generate AI untuk mengisi soal kurang (jika < 20)
- Tombol "Preview" → halaman Preview yang sama dengan Generate
- Soal dari bank ditandai asalnya (dari bank / dari AI generate)

### US-BS-5: Lihat bank publik guru lain

> **Sebagai** guru, **saya ingin** melihat bank soal publik guru lain **agar** bisa menggunakan soal yang sudah dibuat oleh rekan sejawat.

**Acceptance Criteria:**
- Tab di halaman Bank Soal: "Bank Saya" dan "Bank Publik"
- "Bank Publik" menampilkan soal dari semua guru yang toggle public on
- Filter dan search sama dengan "Bank Saya"
- Guru bisa "gunakan" soal dari bank publik → soal ditambahkan ke bank sendiri
- Soal yang digunakan tetap menunjukkan penulis asli

### US-BS-6: Statistik bank

> **Sebagai** guru, **saya ingin** melihat statistik bank soal saya **agar** tahu seberapa banyak soal yang sudah saya kumpulkan.

**Acceptance Criteria:**
- Statistik di halaman Bank Soal:
  - Total soal per mapel
  - Soal yang digunakan di ujian
  - Soal yang dipakai guru lain (jika publik)
- Statistik per soal:
  - Berapa kali digunakan di ujian
  - Berapa guru yang menggunakan (jika publik)

---

## 4. Definition of Done

PRD v4 rilis hanya saat **semua** item DoD berikut terpenuhi.

### 4.1 Database

- [ ] Tabel `bank_questions`: id, user_id, question_id (FK), subject, grade, topics, difficulty, type, payload, is_public, usage_count, created_at
- [ ] Tabel `bank_shares`: id, bank_question_id, shared_with_user_id, created_at (opsional, untuk fitur share ke spesifik guru)
- [ ] Migrasi Drizzle clean, `pnpm db:migrate` success

### 4.2 API

- [ ] `POST /api/bank` — simpan soal ke bank
- [ ] `GET /api/bank` — browse bank (filter, search, pagination)
- [ ] `GET /api/bank/public` — browse bank publik
- [ ] `PATCH /api/bank/:id` — update (toggle public, dll)
- [ ] `DELETE /api/bank/:id` — hapus dari bank
- [ ] `POST /api/bank/build-exam` — buat ujian dari soal bank
- [ ] Semua endpoint dilindungi auth middleware
- [ ] Test coverage ≥80% untuk endpoint baru

### 4.3 UI

- [ ] Route `/bank-soal` — browse bank (tab: Bank Saya / Bank Publik)
- [ ] Tombol "Simpan ke Bank" di Review, Preview, Fast Track
- [ ] Exam Builder: pilih soal → konfigurasi → preview
- [ ] Filter, search, pagination berfungsi
- [ ] Responsive: desktop-first, basic tablet support

### 4.4 Browser Verification

- [ ] Generate → Review → Simpan ke Bank → Bank Soal → Exam Builder → Preview → Cetak
- [ ] Toggle public/private berfungsi
- [ ] Bank Publik menampilkan soal guru lain
- [ ] Tidak ada console error/warning

---

## 5. Success Metrics

Diukur 30 hari setelah rilis ke produksi.

| Metrik | Target | Cara Ukur |
|--------|--------|-----------|
| Bank save rate (% soal yang disimpan dari generate) | ≥20% | Data bank_questions |
| Exam Builder usage (% ujian baru dari bank) | ≥10% | Data exams (source field) |
| Public bank adoption (% guru yang toggle public) | ≥5% | Data users |
| Bank browse engagement (% guru yang buka /bank-soal) | ≥25% | Analytics |
| Soal reuse rate (% soal bank yang digunakan ≥2×) | ≥15% | Data usage_count |

---

## 6. Out of Scope

Eksplisit **tidak** dikerjakan dalam PRD v4:

- **Moderasi bank soal** — tidak ada review/admin yang menyetujui soal sebelum publik. Trust guru.
- **Bank soal per sekolah** — bank milik individu guru, bukan kolektif sekolah
- **Import soal dari luar** — tidak ada import dari Word/Excel/website lain
- **Soal esai di bank** — hanya pilihan ganda (mengikuti PRD v2/v3)
- **Versi soal** — tidak ada versioning; edit soal = overwrite
- **Notifikasi** — tidak ada notifikasi "guru X menggunakan soal Anda"
- **Rating/review soal** — tidak ada bintang atau komentar pada soal

---

## 7. Risks & Open Questions

| # | Risiko | Mitigasi |
| - | ------ | -------- |
| 1 | Bank size grows unbounded → slow queries | Pagination + archiving soal lama (>6 bulan tidak dipakai) |
| 2 | Guru menyimpan soal berkualitas rendah | Phase 1: trust teachers; add moderation/flagging later |
| 3 | Bank publik bisa disalahgunakan (spam, soal tidak relevan) | Report button + admin review di Phase 2 |
| 4 | Exam Builder kompleks (drag & drop, reorder) | Phase 1: simple select + auto-sort; drag & drop di Phase 2 |
| 5 | Soal dari bank bisa tidak relevan dengan kurikulum terbaru | Warning jika soal >1 tahun; guru bisa update |

---

## 8. Approval

PRD ini dianggap **approved** saat:

- 1 guru SD reviewer menandatangani user stories sebagai realistis.
- 1 lead developer menandatangani DoD sebagai dapat dikerjakan.
- Stakeholder produk menandatangani target launch dan success metrics.

Tanda tangan tercatat sebagai komentar di PR yang menambahkan dokumen ini.
