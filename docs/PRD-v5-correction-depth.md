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

### 2.2 Student Identity Capture

**Konteks:** Murid menulis nama mereka sendiri di lembar jawaban kertas. Saat guru mengoreksi, guru menyalin nama itu ke aplikasi sebelum menandai jawaban A/B/C/D. Form Nama+Absen adalah satu-satunya pintu masuk ke koreksi. Tanpa nama, guru tidak dapat menandai jawaban — karena tanpa identitas, satu baris di `student_answers` tidak punya makna.

**Alur per murid:**

1. Guru membuka halaman Koreksi untuk satu ujian (mis. dari Riwayat).
2. Sistem menampilkan form **"Mulai koreksi murid"**:
   - **Nama Murid** (required, text, max 80 char)
   - **No. Absen** (optional, integer 1–60; auto-increment dari murid sebelumnya jika ada)
3. Guru menekan **Mulai**:
   - Sistem mencari `students` row case-insensitive berdasarkan `(user_id, class_label, subject, normalized_name)` (§2.2bis).
   - **Jika tidak ada** → buat row baru di `students`, lalu inisialisasi 20 placeholder rows di `student_answers` (selected_answer = NULL) yang FK-nya ke `students.id` baru.
   - **Jika ada (dedup hit)** → tampilkan dialog: "Nama 'Budi Santoso' sudah dikoreksi sebelumnya untuk Kelas 5 Bahasa Indonesia. Lanjutkan murid yang sama?"
     - Pilihan: **Ya, sama** (gunakan student_id yang ada → bisa lanjut menambah/mengoreksi jawaban di ujian ini), **Beda, buat baru** (override dengan nama+suffix mis. "Budi Santoso (2)" + sebagai `students` row terpisah), **Batal** (kembali ke form).
4. Setelah row `students` ditentukan, panel jawaban A/B/C/D × 20 soal muncul.
5. Setiap klik jawaban → debounced auto-save (max 1 detik) ke `student_answers` row yang sesuai (lihat §2.3).
6. Guru menekan **Selesai → Murid Berikutnya** → form di langkah 2 muncul lagi, No. Absen +1, Nama kosong (atau autocomplete dari `students` table — §2.2.1).

**Alur batch CSV:** Lihat §2.4. Setiap baris CSV → upsert ke `students` (dedup case-insensitive) → 20 rows di `student_answers`.

**Validasi nama (form):**
- Required, trim whitespace, collapse spasi ganda, max 80 chars.
- `normalized_name = lower(trim(collapse_spaces(name)))` digunakan untuk dedup.
- Nama tampilan menyimpan kapitalisasi asli yang diketik guru ("Budi Santoso").
- Nama kosong/whitespace ditolak — form tidak bisa di-submit.

#### 2.2.1 Autocomplete dari students table

Saat guru mengetik di field Nama Murid, dropdown menampilkan murid yang sudah ada di `students` table dalam scope **(user_id, class_label, subject)** yang sama dengan ujian sekarang. Sumber: `SELECT name, student_number FROM students WHERE user_id = ? AND class_label = ? AND subject = ? AND normalized_name LIKE lower(?) || '%' ORDER BY name LIMIT 10`. Trigger setelah ≥2 char, debounce 200ms.

Klik suggestion → field Nama+Absen terisi. Submit → flow ke langkah 3 dengan dedup hit otomatis (Ya, sama).

#### 2.2.2 Edit nama murid

Guru bisa mengedit nama (typo correction) di rekap kelas:

- Edit `students.name` (single row) → propagated ke semua exam karena `student_answers` punya FK `student_id`, bukan kolom nama.
- `normalized_name` ter-recompute: trigger dedup re-check — jika nama baru bertabrakan dengan murid lain di scope yang sama → dialog "Nama ini sudah dipakai murid #4. Gabungkan jawaban ke murid #4?"
  - **Gabungkan** → merge: `UPDATE student_answers SET student_id = <#4_id> WHERE student_id = <current_id>`, lalu hapus current `students` row. Jika #4 dan current punya jawaban untuk soal yang sama di ujian yang sama (konflik), tampilkan side-by-side resolver sebelum merge.
  - **Batalkan** → revert edit nama ke value sebelumnya.

#### 2.2.3 Hapus murid

- **Hapus dari ujian ini saja**: hapus 20 `student_answers` rows untuk `(student_id, exam_id)`. `students` row tetap ada untuk ujian lain + historical trends.
- **Hapus murid sepenuhnya**: konfirmasi dialog menyebutkan jumlah ujian yang terdampak → cascade delete semua `student_answers` lintas ujian, lalu hapus `students` row.

#### 2.2.4 Privasi & retensi

- `students` row scope: `user_id` (guru pengguna). Tidak ada sharing antar guru, antar sekolah, atau ke endpoint publik.
- Endpoint mengembalikan student data hanya jika requester `user_id` cocok dengan `students.user_id`.
- Retensi: nama disimpan selama akun guru aktif. Hapus akun guru → cascade delete `students` + `student_answers` + `correction_sessions`.
- Tidak ada nama murid di analytics, telemetry, atau log API. Tidak ada agregat cross-tenant.
- Export CSV (US-CD-6): file mengandung nama; guru bertanggung jawab atas distribusinya.

#### 2.2.5 Mengapa kita aman dari kekhawatiran privasi PRD v2

PRD v2 baris 763: "Koreksi berjalan client-side; privasi murid." Konteks saat itu: tim belum yakin apakah menyimpan nama murid memerlukan persetujuan orang tua atau review legal.

PRD v5 merevisi stance ini karena:

1. **Lembar jawaban kertas sudah memuat nama** — aplikasi hanya mendigitalisasi rekap yang sebelumnya akan ditulis di buku rekap kelas guru.
2. **Tenant isolation:** data terkurung di akun guru. Tidak ada profil murid yang bisa dilihat siapa pun selain guru pemilik akun.
3. **Tidak ada PII tambahan di luar nama, no. absen, dan jawaban** — tidak ada NIK, alamat, foto, kontak orang tua, atau data sensitif lain.
4. **Hak hapus eksplisit:** per murid (cascade), per sesi koreksi, per akun.

Keputusan ini tercatat sebagai **D-1** di `docs/ROADMAP.md`.

### 2.2bis Students Data Model

Tabel `students` adalah **identity hub** untuk koreksi: satu murid nyata = satu baris.

**Kolom logis** (rincian SQL ada di §4.1):

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | FK ke `user` | guru pemilik (better-auth user) |
| `class_label` | text | mis. "Kelas 5A", diturunkan dari `exams.classContext` saat student pertama dibuat; bisa diubah guru |
| `subject` | enum exam_subject | scope dedup — "Budi" di Bahasa Indonesia ≠ "Budi" di Matematika (boleh dianggap berbeda murid jika guru memang mengelola dua kelas berbeda) |
| `name` | text(80) | sebagaimana diketik guru, kapitalisasi dipertahankan |
| `normalized_name` | text generated, indexed | `lower(trim(collapse_spaces(name)))` — digunakan untuk autocomplete + dedup |
| `student_number` | smallint nullable | no. absen tipikal di kelas ini; informational, nullable jika guru tidak memakai absen |
| `created_at` / `updated_at` | timestamptz | |

**Aturan dedup:**

- Unique constraint `(user_id, class_label, subject, normalized_name)`.
- Saat guru "Mulai koreksi murid" dengan nama yang masuk constraint ini → dialog §2.2 muncul. Bukan auto-merge (guru harus memilih).

**Aturan scope:**

- "Budi" di Kelas 5A Bahasa Indonesia dan "Budi" di Kelas 5A Pendidikan Pancasila adalah **dua row terpisah** secara default — karena guru bisa berbeda untuk dua mapel walau anak yang sama. Unified by class+subject keeps the model symmetric and avoids surprising merges. (Future PRD bisa tambahkan "link murid lintas mapel"; out of scope v5.)
- "Budi" di Kelas 5A vs "Budi" di Kelas 5B adalah dua row terpisah. Mengubah `class_label` tidak men-trigger merge otomatis — guru lakukan manual jika perlu.

**Hubungan dengan `student_answers`:**

- `student_answers.student_id` (uuid) FK to `students.id`, ON DELETE CASCADE.
- Kolom `student_name` dan `student_number` **tidak disimpan di `student_answers`** — diturunkan via JOIN ke `students`.
- Item analysis (§2.5) mengagregat per `question_number` di seluruh `student_answers` untuk satu sesi — tidak butuh nama.
- Historical trends (§2.8) join `student_answers → correction_sessions → exams` di sumbu waktu untuk satu `students.id`.

### 2.3 Koreksi Persisten

**Alur:**
1. Guru masuk ke halaman Koreksi (dari Riwayat atau dari Preview)
2. Form §2.2 muncul (identifikasi murid terlebih dahulu)
3. Setiap klik A/B/C/D otomatis tersimpan ke database (debounced, max 1 detik)
4. Guru bisa tutup halaman dan kembali kapan saja → data tetap ada (dimuat via `student_id` JOIN)
5. Guru bisa buka koreksi yang sama untuk menambah/mengoreksi murid

**Perubahan dari PRD v2:**
- PRD v2: data di React state, hilang saat tutup halaman; tanpa identitas murid di DB
- PRD v5: data di database, persisten; identitas murid via `students` table (D-1)

### 2.4 Batch Import

**Alur:**
1. Di halaman Koreksi, tombol "Import dari CSV"
2. Upload CSV dengan format: nama, no_absen, jawaban_1, jawaban_2, ..., jawaban_20
3. Sistem parsing CSV → untuk setiap baris, **upsert ke `students`** (dedup case-insensitive dengan scope `(user_id, class_label, subject, normalized_name)`) → buat 20 `student_answers` rows → hitung skor → tampilkan preview dedup ("3 murid baru, 2 murid sudah ada — gabungkan otomatis?") → konfirmasi → rekap muncul
4. Guru bisa edit individual setelah import

**Format CSV:**
```
Nama,No Absen,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20
Budi,1,A,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D
Ani,2,B,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D,A,B,C,D
```

### 2.5 Item Analysis

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

### 2.6 Class Comparison

**Tampilan:**
- Tabel: kelas, rata-rata, median, min, max, % lulus (≥60)
- Chart: bar chart perbandingan rata-rata antar kelas
- Filter: per ujian, per mapel

**Alur:**
1. Guru membuka halaman "Perbandingan Kelas" dari Riwayat
2. Pilih ujian (yang sudah dikoreksi di ≥2 kelas)
3. Tampilkan perbandingan statistik

### 2.7 Export CSV

**Fitur:**
- Tombol "Export CSV" di halaman Rekap
- Format: nama (JOIN dari `students`), no_absen, benar, salah, nilai, detail_jawaban
- Buka di Excel/Google Sheets
- Export per kelas atau per ujian

### 2.8 Historical Trends

**Fitur:**
- Per siswa: grafik skor dari ujian ke ujian (key: `students.id`)
- Per kelas: grafik rata-rata dari ujian ke ujian
- Filter: per mapel, per semester

**Tampilan:**
- Line chart: x-axis = ujian (tanggal), y-axis = skor
- Tabel: nama siswa (dari `students.name`), skor ujian 1, skor ujian 2, skor ujian 3, tren (↑↓→)

---

## 3. User Stories

Penomoran melanjutkan konvensi PRD v2–v3; prefix `CD` = Correction Depth.

### US-CD-1: Capture student identity and persist correction

> **Sebagai** guru, **saya ingin** memasukkan nama murid dari lembar jawaban dan menyimpan hasil koreksi otomatis **agar** rekap saya terhubung ke murid yang benar dan tidak hilang saat menutup halaman.

**Acceptance Criteria:**
- Sebelum panel jawaban muncul, form §2.2 (Nama Murid required, No. Absen optional) di-render.
- Submit kosong/whitespace → ditolak dengan inline error.
- Submit dengan nama baru → row baru di `students` (scope `user_id` + `class_label` + `subject`), 20 placeholder rows di `student_answers`, panel jawaban muncul.
- Submit dengan nama yang ada di scope yang sama → dedup dialog (§2.2 step 3) muncul; pilihan "Ya, sama" reuse `students.id`, "Beda, buat baru" tambah suffix, "Batal" kembali ke form.
- Setiap klik A/B/C/D → debounced auto-save ≤1 detik; indicator "Disimpan ✓".
- Tutup halaman → buka kembali → semua data ter-load via `student_id` JOIN.
- Autocomplete (§2.2.1) muncul setelah ≥2 char, sumber `students` di scope yang sama.
- Browser verification: console bersih, snapshot menunjukkan form gating panel jawaban.

### US-CD-1b: Manage students roster (edit, merge, delete)

> **Sebagai** guru, **saya ingin** mengedit nama murid (typo), menggabungkan dua row yang ternyata murid yang sama, atau menghapus murid **agar** roster saya konsisten lintas ujian.

**Acceptance Criteria:**
- Di rekap kelas atau di halaman "Kelola Murid" (per teacher × class × subject), guru bisa:
  - **Edit nama**: inline edit, debounce save. Jika `normalized_name` baru bertabrakan → dialog "Gabungkan dengan murid #N?" (§2.2.2). Pilihan Gabungkan / Batalkan.
  - **Hapus dari ujian ini saja**: menghapus 20 `student_answers` rows untuk `(student_id, exam_id)`. `students` row tidak dihapus.
  - **Hapus murid sepenuhnya**: cascade delete `student_answers` di seluruh ujian + hapus `students` row. Konfirmasi dialog menyebutkan jumlah ujian yang terdampak.
- Merge resolver: jika dua row punya jawaban untuk soal yang sama di ujian yang sama, tampilkan side-by-side resolver sebelum merge (§2.2.2).
- Browser verification: edit propagates ke historical trends; hapus terverifikasi pasca-reload.

### US-CD-2: Resume and edit prior correction session

> **Sebagai** guru, **saya ingin** membuka koreksi yang sudah pernah saya mulai **agar** bisa melanjutkan, menambah murid baru, atau mengoreksi murid yang sudah ada.

**Acceptance Criteria:**
- Dari Riwayat, tombol "Koreksi" memuat sesi yang ada untuk `(exam_id, user_id)`.
- Daftar murid yang sudah dikoreksi tampil (nama via JOIN ke `students`, no. absen, skor) — guru memilih murid untuk lanjut atau menekan "Tambah Murid Baru" (form §2.2 muncul).
- Klik nama murid yang sudah ada → panel jawaban muncul dengan jawaban yang ditandai. Form Nama+Absen tidak ditampilkan ulang (sudah di-resolve).
- Edit nama dari rekap → mengikuti US-CD-1b (mungkin trigger merge dialog).
- "Hapus murid dari ujian ini" / "Hapus murid sepenuhnya" tersedia per-row (US-CD-1b).
- Opsi "Mulai Koreksi Baru" → konfirmasi (akan menghapus sesi lama untuk ujian ini, bukan `students` rows) → guru memulai dari kosong.

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

- [ ] Tabel `students`:
  - `id uuid PK`
  - `user_id` FK to `user(id)` ON DELETE CASCADE — pemilik guru
  - `class_label text not null` — mis. "Kelas 5A"
  - `subject` exam_subject enum
  - `name varchar(80) not null` — sebagaimana diketik guru
  - `normalized_name text generated always as (lower(trim(regexp_replace(name, '\s+', ' ', 'g')))) stored` — index target
  - `student_number smallint nullable` — 1–60
  - `created_at timestamptz default now()`, `updated_at timestamptz`
  - Unique `(user_id, class_label, subject, normalized_name)`
  - Index `(user_id, class_label, subject, normalized_name)` untuk autocomplete prefix scan
- [ ] Tabel `correction_sessions`:
  - `id uuid PK`
  - `exam_id` FK to `exams(id)` ON DELETE CASCADE
  - `user_id` FK to `user(id)`
  - `created_at`, `updated_at`
  - Unique `(exam_id, user_id)` — satu sesi per guru per ujian
- [ ] Tabel `student_answers`:
  - `id uuid PK`
  - `session_id` FK to `correction_sessions(id)` ON DELETE CASCADE
  - `student_id` FK to `students(id)` ON DELETE CASCADE
  - `question_number smallint not null` (1–20)
  - `selected_answer` enum a/b/c/d nullable (null = belum dijawab)
  - `is_correct boolean nullable` (null saat selected_answer null)
  - `created_at`, `updated_at`
  - Unique `(session_id, student_id, question_number)`
  - Index `(student_id, session_id)` untuk historical trends
- [ ] Migrasi Drizzle clean, `pnpm db:migrate` success di env lokal dan staging
- [ ] Cascade tested: delete `students` row → cascade `student_answers` di seluruh ujian; delete `correction_sessions` row → cascade `student_answers` ujian itu, `students` rows tetap

### 4.2 API

**Students:**
- [ ] `GET /api/students?class_label=&subject=&q=` — list/filter/search murid guru; autocomplete sumber §2.2.1 saat `q` present
- [ ] `POST /api/students` — buat row baru (body: `{ class_label, subject, name, student_number? }`); 409 jika dedup hit
- [ ] `PATCH /api/students/:studentId` — edit nama/no.absen/class_label; 409 jika edit nama bertabrakan (response berisi conflict target id)
- [ ] `POST /api/students/:studentId/merge` — body `{ target_student_id, conflict_resolution: 'keep_source' | 'keep_target' | { per_question: {...} } }` — merge `student_answers`, hapus source row
- [ ] `DELETE /api/students/:studentId` — hapus murid + cascade `student_answers` lintas ujian; response dengan jumlah ujian terdampak

**Corrections:**
- [ ] `POST /api/corrections` — buat/idempotent sesi koreksi untuk `(exam_id, user_id)`
- [ ] `GET /api/corrections/:examId` — load sesi + daftar murid (JOIN `students`) + jawaban
- [ ] `POST /api/corrections/:examId/students` — attach student ke sesi (body: `{ student_id }` atau `{ name, student_number? }` untuk auto-create+attach)
- [ ] `PATCH /api/corrections/:examId/students/:studentId/answers` — bulk patch jawaban (debounced client)
- [ ] `DELETE /api/corrections/:examId/students/:studentId` — hapus murid dari ujian ini saja (`students` row tetap)
- [ ] `POST /api/corrections/:examId/import` — CSV import; upsert `students` per row; create `student_answers`
- [ ] `GET /api/corrections/:examId/analysis` — item analysis
- [ ] `GET /api/corrections/compare?exam_ids=` — class comparison
- [ ] `GET /api/corrections/:examId/export` — CSV export (JOIN `students` for nama/no_absen)

**Trends:**
- [ ] `GET /api/students/:studentId/trends?subject=&semester=` — historical trend untuk satu murid lintas ujian

**Cross-cutting:**
- [ ] Semua endpoint dilindungi auth middleware. 404 (bukan 403) untuk resource yang bukan milik user — mencegah enumerasi murid antar guru.
- [ ] Test coverage ≥80% untuk endpoint baru, including: dedup 409 path, merge resolver, cascade delete, unauthorized 404, autocomplete prefix.

### 4.3 UI

- [ ] Form §2.2 "Mulai koreksi murid" gating panel jawaban; required validation; submit kosong tidak diperbolehkan
- [ ] Autocomplete §2.2.1: dropdown setelah ≥2 char, debounce 200ms, klik suggestion mengisi nama+absen
- [ ] Dedup dialog: "Ya, sama" / "Beda, buat baru (+suffix)" / "Batal"
- [ ] Edit nama inline di rekap; jika tabrakan → merge dialog dengan side-by-side conflict resolver (US-CD-1b)
- [ ] "Hapus dari ujian ini" / "Hapus murid sepenuhnya" — confirm dialog menyebutkan jumlah ujian terdampak
- [ ] Halaman "Kelola Murid" per teacher × class × subject: list, filter, edit, merge, delete
- [ ] Auto-save indicator "Disimpan ✓" setelah klik jawaban
- [ ] Load sesi koreksi sebelumnya dari Riwayat: list murid, klik untuk lanjut
- [ ] Import CSV: upload + dedup preview ("X murid baru, Y murid sudah ada") + konfirmasi + error handling
- [ ] Item analysis: tabel per soal dengan highlight (§2.5)
- [ ] Class comparison: tabel + chart (§2.6)
- [ ] Export CSV: tombol + download (§2.7)
- [ ] Historical trends: line chart per siswa (key `students.id`) dan per kelas (§2.8)
- [ ] Responsive: desktop-first, basic tablet support

### 4.4 Browser Verification

Mengikuti CLAUDE.md agent-browser policy. Setiap baris harus dibuktikan dengan snapshot + console-clean.

- [ ] Buka Koreksi → form Nama Murid muncul → submit kosong gagal → submit valid → panel jawaban muncul
- [ ] Mark 5 jawaban → tutup tab → buka kembali → 5 jawaban tetap, nama+absen tetap (dimuat via JOIN)
- [ ] Ketik nama yang sudah ada di scope sama → dedup dialog → "Ya, sama" memuat jawaban murid existing
- [ ] Edit nama (typo fix) di rekap → autosave → reload → nama baru ter-persist; trends untuk murid ini tetap utuh
- [ ] Edit nama menjadi nama murid lain di scope sama → merge dialog muncul; pilih "Gabungkan" → resolver tampil jika ada konflik; pasca-merge, hanya satu row di rekap
- [ ] Hapus murid dari ujian ini → ujian lain murid yang sama tetap punya datanya (verifikasi via Kelola Murid)
- [ ] Hapus murid sepenuhnya → konfirmasi menyebut jumlah ujian → pasca-delete, semua datanya hilang
- [ ] Autocomplete: ≥2 char nama yang ada di scope → dropdown muncul → klik → flow ke dedup-hit branch
- [ ] Import CSV → preview dedup (X baru, Y existing) → confirm → rekap muncul dengan nama dari CSV
- [ ] Item analysis → tabel muncul; nama murid tidak terkirim ke endpoint analytics (verify DevTools network tab)
- [ ] Trends → buka satu murid → line chart skor lintas ujian; konsisten setelah edit nama
- [ ] Export CSV → file terunduh dengan nama dari `students`
- [ ] `agent-browser` console buffer kosong di seluruh alur
- [ ] Screenshots disimpan di `.agent-browser/m5-<task>.png`

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
| 2 | Large class sizes (40+ murid) → query lambat | Index + pagination pada `student_answers` |
| 3 | CSV format tidak standar → guru bingung | Template CSV bisa diunduh + contoh format |
| 4 | Item analysis tidak berguna jika <5 murid | Minimum threshold 5 murid sebelum analisis muncul |
| 5 | Historical trends butuh banyak data (≥2 ujian) | Minimum threshold 2 ujian sebelum tren muncul |
| 6 | Dedup salah-merge dua murid berbeda yang kebetulan namanya sama persis (mis. dua "Budi") | Suffix "Budi (2)" + UI merge selalu opt-in (tidak auto-merge); halaman Kelola Murid memungkinkan reverse via merge dialog |
| 7 | Guru salah ketik nama → trends pecah | Autocomplete §2.2.1 + edit nama dengan merge dialog; merge resolver mengembalikan rows ke single `students.id` |
| 8 | Permintaan hapus data murid (orang tua/sekolah) | UI hapus per murid (cascade), per ujian, per akun (settings); §2.2.4 mendokumentasikan retensi |
| 9 | Skema students bertabrakan dengan future SIS / multi-teacher account | Out of scope v5; struktur scope `(user_id, class_label, subject)` mempertahankan tenancy walau diperluas nanti |
| 10 | Class label diubah guru (mis. "Kelas 5A" → "5A") → dedup pecah | PATCH endpoint re-check unique constraint dan tawarkan merge jika collision; propagate class_label change ke seluruh row student di scope tersebut |

---

## 8. Approval

PRD ini dianggap **approved** saat:

- 1 guru SD reviewer menandatangani user stories sebagai realistis.
- 1 lead developer menandatangani DoD sebagai dapat dikerjakan.
- Stakeholder produk menandatangani target launch dan success metrics.

Tanda tangan tercatat sebagai komentar di PR yang menambahkan dokumen ini.
