# Product Requirements Document (PRD) v2

## School Exam Generator — Ujian SD Kelas 5 & 6


| Field             | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| **Product Name**  | School Exam Generator (Ujian SD)                                  |
| **Version**       | 2.0 (MVP — hackathon scope)                                       |
| **Date**          | 2026-04-22                                                        |
| **Status**        | Active                                                            |
| **Target Launch** | 2026-04-26 (hackathon demo)                                       |
| **Baseline**      | PRD v1.0 (2026-04-16) — scope narrowed, evaluation features added |


---

## 1. Executive Summary

### 1.1 Problem Statement

Guru SD Kelas 5 dan 6 di Indonesia menghadapi tantangan dalam pembuatan soal ujian:

- **Manual & lambat** — Guru harus membuat soal satu per satu, menyusun format kertas ujian, dan memastikan kesesuaian kurikulum secara manual
- **Tidak konsisten** — Format ujian berbeda-beda antar guru, tidak ada standarisasi
- **Kurang variasi** — Keterbatasan waktu menyebabkan soal digunakan berulang dari tahun ke tahun
- **Kurikulum Merdeka masih baru** — Banyak guru masih adaptasi dengan Capaian Pembelajaran (CP) Fase C; referensi soal yang selaras CP masih terbatas
- **Merakit lembar utuh memakan waktu** — Yang dibutuhkan di kelas adalah **lembar soal lengkap** (kop, petunjuk, banyak nomor), bukan sekadar satu item soal terpisah
- **Evaluasi/koreksi manual lambat** — Setelah ujian, guru harus mengoreksi 20–30+ lembar jawaban murid satu per satu terhadap kunci jawaban

### 1.2 Solution

**Unit utama produk pada MVP adalah lembar soal (format TKA):** satu dokumen cetak yang memuat **20 soal** pilihan ganda (a, b, c, d) dalam **tata letak dua kolom**, dengan kop sekolah, identitas siswa, dan petunjuk pengerjaan. Satu **mata pelajaran** per lembar: **Bahasa Indonesia** atau **Pendidikan Pancasila (PPKN)** (ditentukan saat generate).

**Konteks kurikulum otomatis:** Sistem menggunakan **Kurikulum Merdeka Fase C (Kelas 5–6)** secara bawaan. Capaian Pembelajaran (CP) untuk kedua mapel di-hardcode ke dalam system prompt AI, sehingga guru **tidak perlu menginput data kurikulum** — cukup pilih kelas, mapel, dan topik. Field kurikulum ditampilkan di form sebagai **dropdown disabled** bertuliskan "Kurikulum Merdeka" dengan label "Fase C (Kelas 5–6)" agar guru tahu sistem mengacu kurikulum yang benar. Guru tetap dapat mengupload **PDF materi/buku** sebagai konteks tambahan opsional.

**Alur lengkap MVP — dari login hingga evaluasi:**

1. **Login** via Google → Dashboard
2. **Generate satu lembar** — AI menghasilkan **satu paket 20 soal** selaras CP Fase C secara otomatis, dengan opsi upload PDF materi; guru mereview lalu memfinalkan
3. **Preview & cetak** lembar dalam format TKA standar (soal + **lembar jawaban siswa** + **kunci jawaban**)
4. **Koreksi cepat** — setelah ujian, guru memasukkan jawaban murid ke tool sederhana → skor otomatis dihitung terhadap kunci
5. **Riwayat lembar/ujian** — akses kembali ujian lama untuk cetak ulang atau koreksi

**Dua mode review** tersedia agar guru dapat memilih kecepatan vs kontrol:

- **Fast Track (Cepat — default)**: setelah generate, sistem **auto-accept** 20 soal dan langsung membawa guru ke layar gabungan ringkasan paket + form metadata + tombol Preview Lembar. Tidak ada aksi per-soal yang wajib (lihat US-9b).
- **Slow Track (Detail)**: alur per-soal Terima/Edit/Tolak dengan counter "X dari 20 siap" sebelum ke metadata + preview (lihat US-9).
- Mode dipilih di form Generate (US-8). Jika validator menemukan soal invalid pada Fast Track, sistem **fallback** ke Slow Track hanya untuk item yang bermasalah.

### 1.3 Target

- **Kelas**: SD Kelas 5 dan Kelas 6
- **Fase Kurikulum**: Fase C (Kelas 5–6) — Kurikulum Merdeka
- **Mata Pelajaran**: Bahasa Indonesia, Pendidikan Pancasila / PPKN (satu mapel aktif per lembar)
- **Format Soal**: Pilihan ganda (a, b, c, d)
- **Isi per lembar (MVP)**: **20 soal** per generate / per lembar cetak utama

### 1.4 Curriculum Design Decision

Kurikulum Merdeka menggunakan sistem **Fase**, bukan per-kelas. **Fase C mencakup Kelas 5 DAN 6** sebagai satu periode belajar dua tahun. Capaian Pembelajaran (CP) **identik** untuk kedua kelas — CP tidak dipecah per tahun.

Implikasi desain:


| Aspek                | Keputusan                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CP dalam AI prompt   | **Hardcoded** per mapel — sama untuk Kelas 5 dan 6                                                                    |
| Kurikulum di form    | **Disabled dropdown** menampilkan "Kurikulum Merdeka" + label "Fase C (Kelas 5–6)" — guru melihat tapi tidak mengedit |
| Kelas di form        | **Aktif dropdown** (5 / 6) — mempengaruhi konteks soal dan kesulitan di AI prompt                                     |
| Upload kurikulum     | **Tidak diperlukan** — CP sudah di-hardcode. Satu slot upload untuk PDF materi/buku saja                              |
| Perluasan masa depan | Jika K13 atau fase lain ditambahkan, cukup enable dropdown kurikulum. Tidak perlu redesign UI                         |


### 1.5 MVP Scope


| Lingkup       | MVP (hackathon)                                                                          | Phase 2 (post-hackathon)                                      |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Artefak utama | **Lembar soal** siap cetak (20 PG) + **lembar jawaban siswa** + **kunci jawaban**        | Penyusunan dari **bank soal** + wizard                        |
| AI            | Satu aksi generate → **satu lembar** (20 soal), CP Fase C otomatis + PDF materi opsional | Variasi jumlah, template, multi-fase                          |
| Mode review   | **Fast Track** (default) **& Slow Track** (per-soal)                                     | Confidence-driven auto-routing                                |
| Evaluasi      | **Koreksi cepat** per murid (input jawaban → skor) — tanpa simpan data murid             | Scoring batch, rekap per kelas persisten, analisis butir soal |
| Bank soal     | Tidak menjadi pintu masuk utama                                                          | Browse, tambah manual, filter per mapel                       |
| Kelas & mapel | Kelas 5–6, BI + PPKN                                                                     | Tambah kelas (1–4), tambah mapel (Matematika, IPAS)           |
| Kurikulum     | Merdeka only (Fase C, disabled di form)                                                  | Tambah K13, enable dropdown kurikulum                         |


### 1.6 Changes from PRD v1


| Aspek                     | v1                             | v2 (ini)                                                          |
| ------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Kelas                     | 1, 2                           | **5, 6** (Fase C)                                                 |
| Kurikulum                 | Dropdown aktif (Merdeka + K13) | **Disabled dropdown** — Merdeka only, Fase C label                |
| Mata Pelajaran            | Matematika, Bahasa Indonesia   | **Bahasa Indonesia, PPKN**                                        |
| Curriculum di form        | Manual input                   | **Auto-hardcoded** — guru tidak perlu input CP                    |
| Upload                    | 1 slot (materi)                | **1 slot** (materi) — upload kurikulum dihapus karena CP otomatis |
| Lembar Jawaban Siswa      | Tidak ada                      | **Baru: US-18**                                                   |
| Koreksi/Evaluasi          | Out of scope                   | **Baru: US-19, US-20** (koreksi manual dipercepat)                |
| Curriculum reference (§8) | Kelas 1–2, Merdeka + K13       | **Kelas 5–6 Fase C, Merdeka only**                                |


---

## 2. Target Users & Personas

### 2.1 Primary User: Guru SD Kelas 5–6


| Attribute         | Detail                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Role**          | Guru kelas / Guru mata pelajaran SD Kelas 5 atau 6                                     |
| **Age range**     | 25–55 tahun                                                                            |
| **Tech literacy** | Bervariasi — dari dasar (bisa browsing + print) hingga menengah                        |
| **Device**        | Laptop atau desktop di sekolah/rumah                                                   |
| **Goal**          | Membuat, mencetak, dan mengoreksi soal ujian berkualitas selaras Kurikulum Merdeka     |
| **Pain point**    | Proses manual, adaptasi Kurikulum Merdeka Fase C, koreksi 20+ lembar jawaban per kelas |


### 2.2 User Context

- Guru mengakses aplikasi dari **laptop/PC** (bukan mobile) karena perlu mencetak
- Penggunaan di **sekolah** (lab komputer/ruang guru) atau di **rumah**
- Frekuensi: beberapa kali per semester (UTS, UAS, ulangan harian, TKA)
- Output utama: **kertas ujian A4** + **lembar jawaban** + **kunci jawaban** yang dicetak untuk dibagikan ke murid
- Setelah ujian: guru menggunakan tool koreksi untuk menghitung skor per murid

### 2.3 Non-Users (MVP)

- Murid (tidak ada fitur mengerjakan ujian online)
- Orang tua
- Admin sekolah / Kepala sekolah
- Guru SMP/SMA
- Guru kelas 1–4 (scope Kelas 5–6 only untuk MVP)

---

## 3. User Stories

Alur **MVP**: Login → Dashboard → Generate lembar (AI + CP otomatis) → Review → Preview/Cetak (soal + lembar jawaban + kunci) → Koreksi cepat → Riwayat.

### Epic 1: Authentication

#### US-1: Login via Google

> **Sebagai** guru, **saya ingin** login menggunakan akun Google **agar** tidak perlu membuat akun baru dan mengingat password tambahan.

**Acceptance Criteria:**

- Halaman login menampilkan tombol "Masuk dengan Google"
- Klik tombol → redirect ke Google consent screen
- Setelah consent → redirect kembali ke aplikasi, sudah terautentikasi
- Jika pertama kali login, akun guru otomatis dibuat dari data Google (nama, email, avatar)
- Jika sudah pernah login, langsung masuk ke dashboard
- Tidak ada form registrasi manual

#### US-2: Dashboard

> **Sebagai** guru yang sudah login, **saya ingin** melihat dashboard utama **agar** dapat mengakses fitur inti dengan mudah.

**Acceptance Criteria:**

- Dashboard menampilkan menu utama dengan prioritas MVP:
  1. **Generate Lembar Soal (AI)** — satu aksi menghasilkan **satu lembar berisi 20 soal**
  2. **Riwayat Ujian / Lembar** — daftar lembar yang pernah dibuat
  3. *(Phase 2)* **Bank Soal** — browse & kelola koleksi soal per mapel
- Menampilkan nama dan avatar guru (dari Google)
- Statistik ringkas: jumlah **lembar/ujian tersimpan**, draft vs final
- Akses cepat: tombol/link ke **lembar terakhir** yang dibuat (jika ada)

#### US-3: Logout

> **Sebagai** guru, **saya ingin** logout dari aplikasi **agar** akun saya aman jika menggunakan komputer bersama.

**Acceptance Criteria:**

- Tombol logout tersedia di navbar/header
- Klik logout → session dihapus → redirect ke halaman login
- Setelah logout, akses ke halaman dashboard menghasilkan redirect ke login

---

### Epic 2: Lembar soal — AI generation (MVP)

#### US-7: Upload Materi Referensi

> **Sebagai** guru, **saya ingin** mengupload PDF materi/buku referensi **agar** AI dapat menghasilkan soal yang selaras dengan materi yang sedang diajarkan di kelas.

**Acceptance Criteria:**

- **Satu slot upload** untuk PDF materi/buku (opsional)
- Area upload: drag & drop atau klik pilih file
- Format: hanya PDF; Ukuran maksimal: 10MB
- Setelah upload: menampilkan nama file dan ukuran; tombol hapus
- Teks diekstrak otomatis dari PDF dan disimpan (`pdf_uploads.extracted_text`)
- Upload bersifat **opsional** — tanpa PDF, AI tetap menghasilkan soal selaras CP Fase C yang di-hardcode di system prompt
- Tidak ada slot upload kurikulum — CP Fase C sudah otomatis

#### US-8: Konfigurasi AI — satu lembar = 20 soal

> **Sebagai** guru, **saya ingin** mengisi form konfigurasi **agar** AI menghasilkan **satu lembar penuh** (20 soal) sesuai mapel, topik, dan Capaian Pembelajaran Fase C.

**Acceptance Criteria:**

- Form konfigurasi:
  - **Kelas**: dropdown aktif (**5** / **6**) — mempengaruhi konteks kesulitan dan skenario soal di AI prompt
  - **Kurikulum**: dropdown **disabled** menampilkan **"Kurikulum Merdeka"** dengan ikon 🔒 atau visual "disabled" yang jelas; di bawah dropdown terdapat label teks kecil **"Fase C (Kelas 5–6)"** — guru melihat bahwa sistem mengacu kurikulum yang benar tanpa perlu mengedit
  - **Mata Pelajaran**: dropdown aktif (**Bahasa Indonesia** / **Pendidikan Pancasila**)
  - **Topik/Materi**: dropdown dinamis berdasarkan mapel yang dipilih (lihat §8.3 daftar topik per mapel), dengan opsi teks bebas untuk topik custom
  - **Tingkat Kesulitan**: dropdown (Mudah / Sedang / Sulit / Campuran)
  - **Jumlah soal**: **20** (fixed, label info — bukan input)
  - **Mode Review**: toggle dua opsi — **Cepat (Fast Track, default)** atau **Detail (Slow Track)**. Mode dapat diubah lagi setelah generate
  - **Contoh Soal** (opsional): textarea untuk paste contoh soal yang diinginkan gaya-nya
  - **PDF Materi**: file yang sudah diupload di US-7 (opsional, tampil jika ada)
- **Konteks kurikulum otomatis**: AI selalu menerima CP Fase C yang di-hardcode untuk mapel yang dipilih (§8). Upload materi **menambah** konteks, bukan menggantikan
- Saat kelas berubah (5 ↔ 6), AI prompt menyesuaikan konteks tingkat kognitif dan skenario soal, tapi **CP yang digunakan tetap sama** (Fase C)
- Tombol **"Generate Lembar"**
- Loading state: progress indicator selama AI memproses (estimasi 10–30 detik)
- Error handling: tampilkan pesan jika AI gagal (timeout, rate limit)

#### US-9: Review paket 20 soal (Slow Track / mode Detail)

> **Sebagai** guru, **saya ingin** mereview **20 soal** hasil AI satu per satu **agar** hanya set yang layak yang menjadi **satu lembar soal** siap cetak.

> **Aktif jika** Mode Review = **Detail** di US-8, atau guru **switch** dari Fast Track (US-9b).

**Acceptance Criteria:**

- Hasil generate ditampilkan sebagai **satu paket** untuk satu lembar (card per nomor)
- Setiap item menampilkan: teks soal, pilihan a/b/c/d, jawaban benar, topik, kesulitan
- Per soal: ✅ **Terima**, ✏️ **Edit**, ❌ **Tolak**; soal yang ditolak harus **diganti** (regenerate item) sebelum paket bisa menjadi lembar final
- Bulk: **Terima Semua** / **Tolak Semua**
- Counter utama: **"X dari 20 siap lembar"**
- Tombol **Preview Lembar** tetap nonaktif sampai **20 dari 20** soal sudah siap
- Sebelum masuk preview, guru melengkapi metadata lembar wajib: **nama sekolah, tahun pelajaran, jenis ujian (default: TKA), tanggal/hari, durasi**, dan **petunjuk** (opsional, default 3 poin standar)
- Setelah review, alur utama: **Lanjut ke Preview lembar (US-14)**
- Tombol **Switch ke Mode Cepat** tersedia di header tanpa kehilangan state

#### US-9b: Konfirmasi paket Fast Track (mode Cepat)

> **Sebagai** guru yang sudah percaya output AI, **saya ingin** langsung melompat ke konfirmasi paket tanpa harus menyetujui satu per satu **agar** alur generate → cetak selesai cepat.

> **Aktif jika** Mode Review = **Cepat** di US-8 (default).

**Acceptance Criteria:**

- Setelah generate sukses, sistem **auto-accept** semua 20 soal → guru ke **satu layar gabungan**: ringkasan paket + form metadata + tombol **Preview Lembar**
- Ringkasan paket: **list compact 20 soal** (nomor, ringkas teks soal, jawaban benar, topik/kesulitan) — read-only, scrollable
- Form **metadata wajib** sama dengan US-9
- Tombol **Preview Lembar** aktif segera setelah metadata wajib lengkap
- Tombol **"Switch ke Review Detail"** → buka US-9 dengan pre-marked state
- Tombol per-item **"Edit cepat"** tetap tersedia di tiap baris (modal edit)
- Tombol **"Regenerate paket"** (kembali ke US-8 dengan config yang sama)
- **Safety net**: jika AI gagal validasi (jumlah ≠ 20, field kosong, jawaban invalid), fallback ke US-9 hanya untuk item yang invalid

---

### Epic 3: Preview, cetak & riwayat (MVP)

#### US-14: Preview Ujian (Format TKA)

> **Sebagai** guru, **saya ingin** melihat preview ujian dalam format TKA standar **agar** saya tahu persis bagaimana tampilan cetaknya.

**Acceptance Criteria:**

- Preview hanya dapat dibuka jika metadata lengkap dan paket berisi **tepat 20 soal**
- Preview menampilkan format TKA standar:
  - **KOP Sekolah**: nama sekolah, centered, bold, uppercase
  - **Title**: jenis ujian + tahun pelajaran, centered, underlined
  - **Info Siswa** (2 kolom):
    - Kiri: Nama: ......, No. Absen: ......, Kelas: [5/6] SD
    - Kanan: Mata Pelajaran: **[Bahasa Indonesia / Pend. Pancasila]**, Hari/Tanggal: ......, Waktu: ...... Menit
  - **Petunjuk Pengerjaan**: dalam kotak border, 3 poin standar
  - **Soal**: 2 kolom, nomor urut (1–20), teks soal + pilihan a/b/c/d
- Jika tidak muat satu halaman, **page break** otomatis
- Preview seakurat mungkin dengan output cetak
- Guru bisa memperbaiki metadata header kecil (tanggal, petunjuk) dari layar preview
- **Tab / toggle** untuk beralih antara preview **Lembar Soal**, **Lembar Jawaban**, dan **Kunci Jawaban**

#### US-15: Cetak Ujian

> **Sebagai** guru, **saya ingin** mencetak **lembar soal** langsung dari browser **agar** proses cepat tanpa perlu software tambahan.

**Acceptance Criteria:**

- Tombol **"Cetak Semua"** → dialog print browser dengan semua halaman: soal + lembar jawaban + kunci jawaban
- Tombol cetak terpisah: **"Cetak Soal Saja"**, **"Cetak Lembar Jawaban"**, **"Cetak Kunci"**
- Layout A4 yang rapi saat dicetak:
  - Ukuran kertas: A4
  - Margin: 2cm
  - 2 kolom untuk soal
  - Page break otomatis
- Elemen non-cetak disembunyikan (navbar, tombol, footer)
- Font: serif (Times New Roman style) untuk kesan formal

#### US-16: Cetak Kunci Jawaban

> **Sebagai** guru, **saya ingin** mencetak kunci jawaban sebagai halaman terpisah **agar** mudah mengoreksi ujian.

**Acceptance Criteria:**

- Kunci jawaban muncul di halaman terpisah (page break sebelumnya)
- Format: grid/tabel — "1. A  |  2. B  |  3. C  |  4. D  |  ..."
- Header: "KUNCI JAWABAN" + nama ujian + mata pelajaran + kelas
- **Skor per nomor ditampilkan**: "Setiap jawaban benar bernilai 5 poin. Total: 100 poin" (20 soal × 5 = 100)
- Tercetak otomatis setelah halaman lembar jawaban

#### US-17: Riwayat Ujian

> **Sebagai** guru, **saya ingin** melihat daftar ujian yang pernah saya buat **agar** bisa mengakses kembali ujian lama.

**Acceptance Criteria:**

- Tabel/list menampilkan:
  - Nama ujian (title)
  - Mata pelajaran (Bahasa Indonesia / Pend. Pancasila) + Kelas (5/6)
  - Tanggal dibuat
  - Status: Draft / Final
  - Jumlah soal
- Aksi per ujian:
  - **Cetak** (jika final) → buka preview + print
  - **Koreksi** (jika final) → buka tool koreksi cepat (US-19)
  - **Edit** (jika draft) → buka alur penyuntingan
  - **Duplikat** → buat salinan sebagai draft baru
  - **Hapus** → konfirmasi dialog → hapus
- Sortir berdasarkan tanggal (terbaru di atas)
- Filter berdasarkan status (Draft / Final / Semua) dan mapel

---

### Epic 4: Lembar Jawaban & Evaluasi (MVP — BARU)

#### US-18: Lembar Jawaban Siswa (cetak)

> **Sebagai** guru, **saya ingin** mencetak **lembar jawaban** terpisah untuk siswa **agar** koreksi lebih cepat karena semua jawaban ada di satu halaman.

**Acceptance Criteria:**

- Lembar jawaban tercetak sebagai **halaman terpisah** (page break) setelah halaman soal terakhir dan sebelum kunci jawaban
- Format lembar jawaban:
  - **Header**: KOP sekolah (ringkas), nama ujian, mata pelajaran
  - **Info siswa**: Nama: ......, No. Absen: ......, Kelas: [5/6] SD
  - **Grid jawaban** 20 baris, layout 2 kolom (1–10 kiri, 11–20 kanan):
    ```
    1.  ○ A   ○ B   ○ C   ○ D    │  11. ○ A   ○ B   ○ C   ○ D
    2.  ○ A   ○ B   ○ C   ○ D    │  12. ○ A   ○ B   ○ C   ○ D
    ...                           │  ...
    10. ○ A   ○ B   ○ C   ○ D    │  20. ○ A   ○ B   ○ C   ○ D
    ```
  - **Area tanda tangan**: Tanda tangan siswa, Tanda tangan guru/pengawas
  - **Skor**: area kosong untuk guru menulis skor (Nilai: _____ / 100)
- Lembar jawaban muat di **satu halaman A4** (tidak boleh lebih dari satu halaman)
- Grid jawaban menggunakan lingkaran/oval yang jelas agar siswa dapat menyilang atau melingkari
- Guru dapat mencetak **banyak salinan** lembar jawaban (satu per murid) tanpa mencetak ulang halaman soal — tombol **"Cetak Lembar Jawaban"** terpisah di US-15

#### US-19: Koreksi Cepat (input jawaban → skor)

> **Sebagai** guru, **saya ingin** memasukkan jawaban murid ke dalam sistem dan langsung mendapat skor **agar** proses koreksi 20+ lembar jawaban tidak memakan waktu berjam-jam.

**Acceptance Criteria:**

- Tool koreksi diakses dari **halaman ujian final** (tombol "Koreksi") atau dari **riwayat ujian** (US-17)
- Tampilan: **satu halaman** berisi 20 baris, setiap baris menampilkan:
  - Nomor soal
  - **4 tombol/radio: A B C D** — guru klik jawaban yang dipilih murid
  - Indikator benar/salah muncul **langsung** setelah klik (✅ hijau / ❌ merah) berdasarkan kunci jawaban tersimpan
  - Jika salah, jawaban benar ditampilkan di samping: "❌ (jawaban benar: B)"
- Di bagian atas/bawah halaman:
  - **Nama murid** (text input, opsional — untuk label cetak/catatan)
  - **Skor real-time**: "Benar: X / 20 — Nilai: Y / 100" (dihitung otomatis setiap klik)
  - **Progress bar visual** untuk skor
- Tombol **"Reset"** untuk mengosongkan semua jawaban dan mulai murid baru
- Tombol **"Murid Berikutnya"** → simpan ke rekap sesi (US-20), reset form, fokus ke nama murid baru, nomor urut murid bertambah
- **Keyboard shortcut**: A/B/C/D untuk input cepat, Enter/Tab untuk pindah ke nomor berikutnya — memungkinkan koreksi tanpa mouse
- **Data murid TIDAK disimpan ke database** pada MVP — tool ini murni kalkulasi sesi (in-memory / React state). Data hilang saat halaman ditutup
- Tombol **"Cetak Hasil"** → mencetak ringkasan: nama murid + skor + daftar jawaban benar/salah per nomor (satu halaman)

#### US-20: Rekap Skor Kelas (sesi — tidak persisten)

> **Sebagai** guru, **saya ingin** melihat ringkasan skor semua murid yang sudah saya koreksi dalam satu sesi **agar** bisa membandingkan performa kelas secara sekilas.

**Acceptance Criteria:**

- Setelah mengoreksi beberapa murid (US-19 "Murid Berikutnya"), tabel rekap muncul di samping atau di bawah form koreksi:
  - Kolom: No, Nama Murid, Benar, Salah, Nilai
  - Baris bertambah setiap kali guru klik "Murid Berikutnya" (jika sudah mengisi ≥ 1 jawaban)
  - Baris aktif (murid yang sedang dikoreksi) di-highlight
- Statistik ringkas di bawah tabel: **Rata-rata kelas**, **Nilai tertinggi**, **Nilai terendah**
- Tombol **"Cetak Rekap Kelas"** → mencetak tabel rekap (satu halaman A4)
- **Data hanya di memori sesi** — tidak disimpan ke database. Peringatan ditampilkan: "Data rekap akan hilang jika halaman ditutup. Cetak terlebih dahulu jika perlu."
- *Phase 2 note:* Simpan rekap ke database, analisis butir soal (soal mana yang paling banyak dijawab salah), export ke spreadsheet

---

### Epic 5: Bank Soal (Phase 2)

> US-4 (Browse & Filter), US-5 (Tambah Soal), US-6 (Edit/Hapus) — **Phase 2**, lihat PRD v1.

### Epic 6: Exam Builder dari Bank (Phase 2)

> US-10 (Buat Ujian dari Bank), US-11 (Header Ujian), US-12 (Pilih & Atur Soal), US-13 (Simpan Draft) — **Phase 2**, lihat PRD v1.

---

## 4. Screen-by-Screen Wireframe Descriptions

Urutan: login → dashboard → generate → review → preview/cetak → koreksi → riwayat.

### 4.1 Halaman Login

```
┌─────────────────────────────────────┐
│                                     │
│         🎓 Ujian SD                 │
│    Generator Soal Ujian             │
│      SD Kelas 5 & 6                │
│                                     │
│    ┌───────────────────────┐        │
│    │ 🔵 Masuk dengan Google │        │
│    └───────────────────────┘        │
│                                     │
│    Buat soal ujian dengan mudah     │
│    sesuai Kurikulum Merdeka         │
│    Bahasa Indonesia & Pend.         │
│    Pancasila                        │
│                                     │
└─────────────────────────────────────┘
```

### 4.2 Dashboard

```
┌─────────────────────────────────────┐
│ Ujian SD           👤 Bu Sari  [⏏]  │
├─────────────────────────────────────┤
│                                     │
│  Selamat datang, Bu Sari!           │
│  📝 8 lembar tersimpan (5 final)    │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ 🤖       │  │ 📋       │        │
│  │ Generate │  │ Riwayat  │        │
│  │ Lembar   │  │ Lembar   │        │
│  │ (AI)     │  │ / Ujian  │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  Lembar terakhir:                   │
│  "TKA Bahasa Indonesia K6" - 20 Apr │
│  [🖨 Cetak] [✏ Koreksi]            │
│                                     │
└─────────────────────────────────────┘
```

### 4.3 AI — Generate satu lembar (20 soal)

```
┌─────────────────────────────────────┐
│ ← Dashboard  Generate Lembar (AI)   │
│     1 lembar = 20 soal PG           │
├─────────────────────────────────────┤
│                                     │
│ 📄 Upload Materi/Buku (opsional)    │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│   Drag & drop PDF (maks 10MB)    │ │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                     │
│ Kelas:          [6 SD ▾]           │
│ Kurikulum:      [Merdeka    🔒]    │
│                  Fase C (Kelas 5-6) │
│ Mata Pelajaran: [Bahasa Indo.  ▾]  │
│ Topik:          [Pemahaman Bac.▾]  │
│ Kesulitan:      [Campuran      ▾]  │
│ Jumlah Soal:    20 soal (1 lembar) │
│ Mode Review:    [● Cepat ○ Detail] │
│                                     │
│ Contoh Soal (opsional):            │
│ ┌─────────────────────────────────┐ │
│ │ Paste contoh soal...           │ │
│ └─────────────────────────────────┘ │
│                                     │
│       [🤖 Generate Lembar]          │
└─────────────────────────────────────┘
```

### 4.4 Review (Slow Track)

```
┌─────────────────────────────────────┐
│ ← Generate    Review (20 soal)      │
│ Paket lembar — 17 dari 20 siap      │
│ [✅ Terima Semua] [♻ Ganti ditolak] │
│ [⇄ Switch ke Mode Cepat]           │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Soal #1  | Sedang | Pemahaman  │ │
│ │                                 │ │
│ │ Bacalah kutipan berikut!       │ │
│ │ "Taman Nasional Komodo..."     │ │
│ │ Ide pokok paragraf di atas     │ │
│ │ adalah ...                     │ │
│ │ a. ...  b. ...  c. ...  d. ... │ │
│ │ Jawaban: b                     │ │
│ │                                 │ │
│ │ [✅ Terima] [✏ Edit] [❌ Tolak] │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
│                                     │
│ Metadata Lembar:                     │
│ Sekolah: [SD Negeri 1 Jakarta____]  │
│ TP: [2025/2026__] Jenis: [Ulangan ▾]│  ← lihat §8.6 (5 opsi)
│ Tgl: [22 Apr 2026] Waktu: [60 mnt]  │
│                                     │
│ [Preview nonaktif: 17/20 siap]      │
└─────────────────────────────────────┘
```

### 4.4b Konfirmasi Fast Track

```
┌─────────────────────────────────────┐
│ ← Generate     Konfirmasi Paket     │
│ Mode: Cepat   [⇄ Switch ke Detail] │
│ 20 soal auto-accepted ✓             │
├─────────────────────────────────────┤
│ Ringkasan Paket (read-only):        │
│ ┌─────────────────────────────────┐ │
│ │ 1. Sedang | Pemahaman Bacaan    │ │
│ │    Bacalah kutipan berikut...   │ │
│ │    Jawaban: b        [✏ Edit]   │ │
│ ├─────────────────────────────────┤ │
│ │ 2. Mudah | Kosakata             │ │
│ │    Makna kata "diplomasi"...    │ │
│ │    Jawaban: c        [✏ Edit]   │ │
│ ├─────────────────────────────────┤ │
│ │ ... (scroll ke 20)              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Metadata Lembar (wajib):             │
│ Sekolah: [SD Negeri 1 Jakarta____]  │
│ TP: [2025/2026__] Jenis: [Ulangan ▾]│  ← lihat §8.6 (5 opsi)
│ Tgl: [22 Apr 2026] Waktu: [60 mnt]  │
│                                     │
│  [♻ Regenerate]       [Preview ▶]   │
└─────────────────────────────────────┘
```

### 4.5 Print Preview — soal + lembar jawaban + kunci

```
┌─────────────────────────────────────┐
│ Preview Lembar    [Tab: Soal | LJ   │
│                    | Kunci | Semua]  │
│ [🖨 Cetak Semua] [🖨 Cetak Soal]   │
│ [🖨 Cetak LJ x__] [🖨 Cetak Kunci] │
├─────────────────────────────────────┤
│                                     │
│     === HALAMAN SOAL (1-2 hal) ===  │
│                                     │
│       KOP SURAT SEKOLAH             │
│        SD Negeri 1 Jakarta          │
│    TKA TAHUN PELAJARAN 2025/2026    │
│                                     │
│ Nama  : ..............  Mapel: BI   │
│ No.   : ..............  Tgl  : ...  │
│ Kelas : 6 SD           Waktu: 60m  │
│                                     │
│ PETUNJUK PENGERJAAN:                │
│ ┌─────────────────────────────────┐ │
│ │ 1. Bacalah Do'a sebelum...     │ │
│ │ 2. Kerjakan soal mudah dahulu  │ │
│ │ 3. Bekerjalah dengan jujur     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌───────────────┬───────────────┐   │
│ │ 1. Soal...    │ 11. Soal...   │   │
│ │    a. ...     │     a. ...    │   │
│ │    b. ...     │     b. ...    │   │
│ │    c. ...     │     c. ...    │   │
│ │    d. ...     │     d. ...    │   │
│ │ ...           │ ...           │   │
│ │ 10. Soal...   │ 20. Soal...   │   │
│ └───────────────┴───────────────┘   │
│                                     │
│ ─── page break ───                  │
│                                     │
│   === LEMBAR JAWABAN SISWA ===      │
│                                     │
│       SD Negeri 1 Jakarta           │
│    TKA Bahasa Indonesia 2025/2026   │
│                                     │
│ Nama  : ..............              │
│ No.   : ......  Kelas : 6 SD       │
│                                     │
│ ┌───────────────┬───────────────┐   │
│ │ 1. ○A ○B ○C ○D│11. ○A ○B ○C ○D│  │
│ │ 2. ○A ○B ○C ○D│12. ○A ○B ○C ○D│  │
│ │ ...           │ ...           │   │
│ │10. ○A ○B ○C ○D│20. ○A ○B ○C ○D│  │
│ └───────────────┴───────────────┘   │
│                                     │
│ Nilai: _____ / 100                  │
│ TTD Siswa: ____  TTD Guru: ____     │
│                                     │
│ ─── page break ───                  │
│                                     │
│        === KUNCI JAWABAN ===        │
│ TKA Bahasa Indonesia Kelas 6        │
│ 1.A  2.B  3.C  4.D  5.A            │
│ 6.B  7.C  8.D  9.A  10.B           │
│ 11.C 12.A 13.D 14.B 15.C           │
│ 16.A 17.D 18.B 19.C 20.A           │
│ Setiap jawaban benar = 5 poin      │
│ Total: 100 poin                     │
│                                     │
└─────────────────────────────────────┘
```

### 4.6 Koreksi Cepat

```
┌─────────────────────────────────────┐
│ ← Riwayat    Koreksi Cepat          │
│ TKA Bahasa Indonesia Kelas 6        │
│ 20 soal — Kunci otomatis dari ujian │
├─────────────────────────────────────┤
│                                     │
│ Murid: [Budi Santoso_________] (#3) │
│                                     │
│ Skor: ██████████░░░░ 14/20 = 70     │
│                                     │
│  No  Jawaban Murid      Hasil       │
│  1.  [A] [B] [C] [D]    ✅          │
│  2.  [A] [B] [C] [D]    ❌ (B)      │
│  3.  [A] [B] [C] [D]    ✅          │
│  4.  [A] [B] [C] [D]    ✅          │
│  5.  [A] [B] [C] [D]    ❌ (A)      │
│  ... (scroll)                       │
│ 20.  [A] [B] [C] [D]    ✅          │
│                                     │
│  Shortcut: tekan A/B/C/D → Enter    │
│                                     │
│ [Reset] [Murid Berikutnya →]        │
│ [🖨 Cetak Hasil Murid]              │
├─────────────────────────────────────┤
│ Rekap Kelas (sesi ini):             │
│  No  Nama              Nilai        │
│  1.  Ani Wijaya         85          │
│  2.  Citra Dewi         90          │
│  3.  Budi Santoso       70 ←        │
│                                     │
│  Rata-rata: 81.7 | Max: 90 | Min:70│
│                                     │
│ [🖨 Cetak Rekap Kelas]              │
│ ⚠ Data hilang jika halaman ditutup  │
└─────────────────────────────────────┘
```

### 4.7 Riwayat Ujian / Lembar

```
┌─────────────────────────────────────┐
│ ← Dashboard      Riwayat Ujian     │
│ Filter: [Semua ▾] [Semua mapel ▾]  │
├─────────────────────────────────────┤
│ Ujian              Mapel  Tgl  St.  │
│ ─────────────────────────────────── │
│ TKA B.Indo K6      BI    22/4 Final│
│         [🖨 Cetak] [✏ Koreksi]     │
│         [📋 Duplikat] [🗑 Hapus]    │
│ ─────────────────────────────────── │
│ UTS PPKN K5        PPKN  18/4 Draft│
│         [✏ Edit] [📋 Dup] [🗑]     │
│ ─────────────────────────────────── │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## 5. Non-Functional Requirements

### 5.1 Performance


| Metric                                               | Target                |
| ---------------------------------------------------- | --------------------- |
| Halaman load (dashboard, generate, preview, koreksi) | < 2 detik             |
| AI generation (20 soal)                              | < 30 detik            |
| Print preview render                                 | < 1 detik             |
| API response (CRUD)                                  | < 500ms               |
| Koreksi: input jawaban → feedback                    | Instant (client-side) |


### 5.2 Security

- **Authentication**: Google OAuth 2.0 — tidak ada password yang disimpan
- **Session**: httpOnly cookie, secure flag, SameSite=Lax
- **CSRF**: endpoint mutasi wajib memakai proteksi CSRF (double-submit cookie)
- **Authorization**: Guru hanya bisa akses data miliknya sendiri
- **File upload**: Validasi MIME type (PDF only), size limit (10MB), filename sanitization
- **Upload retention**: PDF referensi expires setelah 7 hari, cleanup otomatis
- **API**: Rate limiting pada endpoint AI generation (max 10/jam per guru)
- **Data murid**: Tidak disimpan di server — koreksi cepat berjalan client-side (React state)

### 5.3 Print Fidelity

- Output cetak **harus** cocok dengan format TKA referensi pada kertas A4
- Lembar jawaban siswa **harus** muat dalam **satu halaman A4**
- Tested pada Chrome dan Firefox print dialog
- Font serif untuk kesan formal
- Margin 2cm sesuai standar dokumen formal

### 5.4 Curriculum Accuracy

- AI selalu menerima konteks **Capaian Pembelajaran (CP) Fase C** yang di-hardcode per mapel — identik untuk Kelas 5 dan 6 (§8)
- **Guru tidak perlu input data kurikulum** — form menampilkan kurikulum sebagai disabled dropdown untuk transparansi
- Upload materi **menambah** konteks soal, bukan menggantikan CP bawaan
- Soal hasil AI harus melalui review guru sebelum difinalkan ke lembar
- Topik dan tingkat kognitif harus sesuai Fase C: analisis dan penerapan, bukan hanya hafalan
- Untuk PPKN: soal harus kontekstual dan aplikatif, bukan sekadar definisi

### 5.5 Accessibility

- Semantic HTML (heading hierarchy, labels, ARIA where needed)
- Keyboard navigable — termasuk keyboard shortcut A/B/C/D pada tool koreksi (US-19)
- Sufficient color contrast (WCAG AA)
- Responsive: desktop-first, basic tablet support

---

## 6. Out of Scope (MVP)


| Feature                                             | Alasan                                      |
| --------------------------------------------------- | ------------------------------------------- |
| Online exam (murid mengerjakan di browser)          | Fokus MVP adalah **lembar cetak**           |
| Scoring otomatis batch (upload foto lembar jawaban) | Koreksi cepat manual sudah cukup untuk MVP  |
| Penyimpanan data murid di database                  | Koreksi berjalan client-side; privasi murid |
| Analisis butir soal (item analysis)                 | Phase 2 setelah data koreksi bisa disimpan  |
| Soal acak (multiple variants)                       | Kompleksitas tambahan, bisa di v2           |
| Essay / isian singkat                               | Fokus pada pilihan ganda                    |
| Mobile app                                          | Guru butuh print → desktop/laptop required  |
| Multi-bahasa (English)                              | Target user: guru Indonesia                 |
| Kelas 1–4, mapel lain (Matematika, IPAS)            | MVP fokus Fase C (Kelas 5–6) — BI + PPKN    |
| K13                                                 | MVP fokus Kurikulum Merdeka only            |
| Export ke DOCX/PDF file                             | Browser print sudah cukup                   |


---

## 7. Success Metrics


| Metric                                         | Target                         | Cara Ukur            |
| ---------------------------------------------- | ------------------------------ | -------------------- |
| Waktu login → cetak lembar (soal + LJ + kunci) | < 5 menit                      | User testing         |
| Waktu koreksi per murid (20 soal)              | < 1 menit                      | User testing         |
| Acceptance rate paket AI (menuju lembar final) | > 70% soal diterima tanpa edit | Data ai_generations  |
| Print fidelity (soal + LJ + kunci)             | 100% cocok format TKA          | Visual comparison    |
| Login success rate                             | > 99%                          | Monitoring auth flow |
| Lembar jawaban muat 1 halaman A4               | 100%                           | Print test           |


---

## 8. Curriculum Reference — Kelas 5–6 SD, Kurikulum Merdeka (Fase C)

Referensi: Keputusan Kepala BSKAP No. 032/H/KR/2024 dan 046/H/KR/2025.

**Catatan penting:** Fase C mencakup **Kelas 5 dan 6 sekaligus**. Capaian Pembelajaran (CP) **identik** untuk kedua kelas — tidak dipecah per tahun. Yang membedakan adalah konteks materi (bab buku) dan tingkat kedalaman yang diharapkan seiring bertambahnya waktu belajar.

### 8.1 Bahasa Indonesia — Fase C (Kelas 5–6)

**4 Elemen Capaian Pembelajaran:**


| Elemen                             | Capaian Pembelajaran                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Menyimak**                       | Menganalisis informasi dengan mengidentifikasi ciri objek, urutan proses kejadian, dan nilai-nilai dari berbagai tipe teks nonfiksi dan fiksi (lisan, teks aural, audio).                                         |
| **Membaca dan Memirsa**            | Membaca dengan fasih; memahami kosakata bermakna denotatif, konotatif, dan kiasan; mengidentifikasi ide pokok dari teks deskripsi, narasi, eksposisi; serta nilai-nilai dalam teks sastra (prosa, pantun, puisi). |
| **Berbicara dan Mempresentasikan** | Menyampaikan informasi secara lisan untuk menghibur dan meyakinkan; menggunakan kosakata baru; memilih kata sesuai norma sosial budaya; mempresentasikan gagasan secara logis, sistematis, kritis.                |
| **Menulis**                        | Menulis berbagai tipe teks dengan kalimat kompleks secara kreatif; menggunakan kaidah kebahasaan dan kosakata bermakna denotatif dan konotatif.                                                                   |


**Materi Kelas 6 (Semester 1):**


| Bab | Judul                            | Topik Utama                                                                   |
| --- | -------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Aku Anak Indonesia               | Unsur intrinsik cerita, surat resmi & pribadi, formulir, surat elektronik     |
| 2   | Musisi Indonesia di Pentas Dunia | Peta pikiran, wawancara, menulis hasil wawancara                              |
| 3   | Situs Warisan Dunia              | Legenda, gaya bahasa (majas), opini vs fakta, kalimat langsung/tidak langsung |
| 4   | Jeda untuk Iklim                 | Teks berita, teks eksplanasi, menanggapi berita, menulis ringkasan            |


**Materi Kelas 6 (Semester 2):**


| Bab | Judul                             | Topik Utama                                                                   |
| --- | --------------------------------- | ----------------------------------------------------------------------------- |
| 5   | Generasi Peduli Lingkungan        | Transkrip pidato, kisah inspiratif, menyampaikan pendapat, menulis pidato     |
| 6   | Liburan Sekolah                   | Iklan, membaca & menyimpulkan, debat, cerita fiksi ilmiah                     |
| 7   | Memiliki Rasa Empati              | Puisi, cerpen, bermain peran, kalimat majemuk bertingkat                      |
| 8   | Bermain di Dunia Maya dengan Aman | Menyampaikan pendapat, teks fiksi/nonfiksi, media sosial aman, daftar pustaka |


### 8.2 Pendidikan Pancasila (PPKN) — Fase C (Kelas 5–6)

**4 Elemen Capaian Pembelajaran:**


| Elemen                   | Capaian Pembelajaran                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pancasila**            | Memahami hubungan antarsila sebagai kesatuan utuh; mengidentifikasi makna nilai Pancasila sebagai pandangan hidup; menerapkan nilai Pancasila di lingkungan keluarga, sekolah, dan masyarakat. |
| **UUD NRI 1945**         | Menganalisis bentuk sederhana norma, aturan, hak, dan kewajiban sebagai anggota keluarga, warga sekolah, dan bagian masyarakat.                                                                |
| **Bhinneka Tunggal Ika** | Menghargai keberagaman budaya dan agama; menunjukkan sikap toleran terhadap perbedaan.                                                                                                         |
| **NKRI**                 | Mengenal wilayah kabupaten/kota/provinsi sebagai bagian NKRI; membangun kebersamaan, persatuan, dan berkontribusi di lingkungan.                                                               |


**Materi Kelas 6 (Semester 1):**


| Bab | Judul                                 | Elemen    | Topik Utama                                       |
| --- | ------------------------------------- | --------- | ------------------------------------------------- |
| 1   | Belajar Pancasila dengan Menyenangkan | Pancasila | Hubungan nilai Pancasila, belajar mengamalkan     |
| 2   | Mengamalkan Pancasila                 | Pancasila | Pancasila sebagai pandangan hidup, mengajak teman |
| 3   | Mengenal Norma, Hak, dan Kewajiban    | UUD 1945  | Norma, hak & kewajiban, kewajiban anak            |
| 4   | Belajar Bermusyawarah                 | UUD 1945  | Manfaat musyawarah, praktik bermusyawarah         |


**Materi Kelas 6 (Semester 2):**


| Bab | Judul                                  | Elemen               | Topik Utama                                 |
| --- | -------------------------------------- | -------------------- | ------------------------------------------- |
| 5   | Menghormati Perbedaan Budaya dan Agama | Bhinneka Tunggal Ika | Keberagaman budaya & agama, toleransi       |
| 6   | Provinsiku Bagian Wilayah NKRI         | NKRI                 | Provinsi di Indonesia, kebanggaan provinsi  |
| 7   | Menjaga Persatuan dan Kesatuan         | NKRI                 | Gotong royong, membiasakan bergotong royong |


### 8.3 Topik Soal untuk AI Generator

```
Bahasa Indonesia:
  Pemahaman Bacaan
  Ide Pokok dan Gagasan Pendukung
  Unsur Intrinsik Cerita (Tokoh, Latar, Alur, Amanat)
  Teks Narasi
  Teks Eksplanasi
  Teks Deskripsi
  Teks Eksposisi
  Teks Persuasi
  Kosakata (Denotatif, Konotatif, Kiasan)
  Gaya Bahasa (Majas)
  Kalimat Langsung dan Tidak Langsung
  Kalimat Majemuk
  Tanda Baca dan Ejaan
  Puisi
  Cerpen dan Fabel
  Dongeng dan Legenda
  Surat Resmi dan Surat Pribadi
  Iklan
  Opini dan Fakta
  Ringkasan dan Kesimpulan

Pendidikan Pancasila:
  Hubungan Antar-Sila dalam Pancasila
  Nilai-Nilai Pancasila sebagai Pandangan Hidup
  Penerapan Nilai Pancasila di Kehidupan Sehari-hari
  Pengamalan Pancasila di Lingkungan Keluarga, Sekolah, Masyarakat
  Norma dalam Kehidupan Bermasyarakat
  Hak dan Kewajiban Warga Negara
  Hak dan Kewajiban Anak
  Keberagaman Budaya Indonesia
  Keberagaman Agama dan Toleransi
  Menghormati Perbedaan
  Provinsi di Indonesia dan Wilayah NKRI
  Persatuan dan Kesatuan Bangsa
  Gotong Royong
  Musyawarah dan Pengambilan Keputusan
```

### 8.4 Prinsip Soal per Mapel

**Bahasa Indonesia — Fase C:**

- Soal mengutamakan **analisis** dan **evaluasi**, bukan hanya mengenali/mengingat
- Gunakan **teks bacaan pendek** (2–5 kalimat) sebagai stimulus untuk soal pemahaman
- Konteks: kehidupan sehari-hari anak kelas 5–6 (sekolah, keluarga, lingkungan, budaya Indonesia)
- Pilihan jawaban harus masuk akal — hindari pilihan absurd

**Pendidikan Pancasila (PPKN) — Fase C:**

- Soal **harus kontekstual**: gunakan skenario/situasi nyata anak SD (pemilihan ketua kelas, kerja kelompok, perbedaan agama antar teman, gotong royong di sekolah)
- **Bukan** soal hafalan definisi — uji **penerapan** nilai dalam situasi
- Pilihan jawaban mencerminkan **sikap/tindakan nyata**, bukan kalimat abstrak

### 8.5 Tingkat Kesulitan per Mapel


| Tingkat    | Bahasa Indonesia                                                                             | PPKN                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Mudah**  | Identifikasi informasi eksplisit dalam teks, arti kata, mengenali jenis teks                 | Mengenali bunyi/makna sila, mengidentifikasi hak vs kewajiban, menyebutkan contoh norma             |
| **Sedang** | Menentukan ide pokok, opini vs fakta, unsur intrinsik, penggunaan majas                      | Menerapkan nilai Pancasila pada situasi, menganalisis norma dalam skenario, musyawarah              |
| **Sulit**  | Menyimpulkan pesan tersirat, analisis hubungan paragraf, evaluasi argumen, perbandingan teks | Mengevaluasi sikap berdasarkan beberapa sila, menganalisis konflik nilai, solusi berbasis Pancasila |


### 8.6 Jenis Lembar & Profil Asesmen

Setiap lembar yang di-generate diasosiasikan dengan **Jenis Lembar** yang menentukan *stakes*, *cakupan*, dan *level kognitif* soal. Nilai disimpan di kolom `exams.exam_type` (text) dan dipakai dua tempat: (1) dicetak di kop lembar siswa, (2) di-inject ke prompt AI sebagai *steering* lewat tabel `EXAM_TYPE_PROFILE` (lihat RFC §9).

**Terminologi:** Kurikulum Merdeka resmi menggunakan istilah **"Asesmen"** (Formatif / Sumatif), bukan "Ulangan/Penilaian". Praktiknya guru SD masih familiar dengan istilah lama (UTS/UAS/Ulangan Harian), jadi UI memakai *dual-label*: label primer = istilah colloquial, sub-label/tooltip = istilah Kurmer resmi.

| value (DB)  | Label UI            | Sublabel (Kurmer)              | Default distribusi (mudah/sedang/sulit dari 20) | Bloom diizinkan |
| ----------- | ------------------- | ------------------------------ | ----------------------------------------------- | --------------- |
| `latihan`   | Latihan Soal        | Asesmen mandiri / drill        | 8 / 8 / 4                                       | C1, C2, C3      |
| `formatif`  | Ulangan Harian      | Asesmen Formatif (Kurmer)      | 6 / 10 / 4                                      | C1, C2, C3      |
| `sts`       | UTS                 | Sumatif Tengah Semester        | 6 / 10 / 4                                      | C1, C2, C3      |
| `sas`       | UAS                 | Sumatif Akhir Semester         | 4 / 10 / 6                                      | C2, C3, C4      |
| `tka`       | TKA                 | Tes Kemampuan Akademik         | 3 / 9 / 8                                       | C2, C3, C4      |

**Default UI:** `formatif` (kasus paling umum guru SD). Backward-compat: row eksisting dengan nilai `'TKA'` (uppercase) dianggap setara `'tka'`.

**Override manual:** Field "Tingkat Kesulitan" eksisting (§8.5) tetap berlaku. Jika guru pilih kesulitan eksplisit (mudah/sedang/sulit), distribusi default dari Jenis Lembar di-skip; jika pilih `campuran` (default), distribusi mengikuti profil di atas.

**Mengapa structured (bukan tone-only)?** Hasil AI lebih *konsisten* dan *terukur* — tiap lembar bisa di-audit ("UTS ini punya 6 soal C1, 10 soal C2, 4 soal C3 sesuai standar"), defensible ke kepala sekolah/pengawas, dan maintainable dari satu mapping table.

### 8.7 Fokus / Tujuan Guru (Class Context)

Field opsional pada form Generate untuk menangkap *intent pedagogis* guru — apa yang sedang ingin ditekankan minggu ini, miskonsepsi yang sering muncul di kelas, atau penyesuaian konteks lokal.

- **UI:** Textarea (3 baris) + chip suggestion dinamis yang menempel template ke textarea saat diklik:
  - `Fokus pada: {topik aktif}` (disabled jika topik kosong)
  - `Kesalahan umum: ...`
  - `Buat soal kontekstual tentang ...`
  - `Hubungkan dengan: ...`
- **Disimpan ke:** `exams.class_context` (kolom existing — lihat RFC §5).
- **Dipakai AI:** di-inject ke prompt sebagai bagian "Konteks/Fokus guru" (lihat RFC §9 prompt template).
- **Tidak dicetak** di lembar siswa — internal steering AI saja.
- Soft limit 500 karakter (counter, bukan hard limit).

**Contoh isi yang baik:**
> "Anak-anak masih bingung bedakan teks persuasi vs eksposisi. Beri lebih banyak soal yang minta identifikasi ciri kalimat ajakan. Hindari topik politik."


---

## 9. User Flow Summary

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───►│ Dashboard │───►│ Generate │───►│  Review  │
│ (Google) │    │  (US-2)   │    │  (US-8)  │    │(US-9/9b) │
└──────────┘    └─────▲─────┘    └──────────┘    └────┬─────┘
                      │                               │
                      │                               ▼
                ┌─────┴─────┐    ┌──────────┐    ┌──────────┐
                │  Riwayat  │◄───│ Koreksi  │◄───│ Preview  │
                │  (US-17)  │    │(US-19/20)│    │ & Cetak  │
                └───────────┘    └──────────┘    │(US-14-18)│
                                                 └──────────┘
                                                      │
                                               Cetak:
                                                 📄 Lembar Soal
                                                 📝 Lembar Jawaban (×N)
                                                 🔑 Kunci Jawaban
```

**Waktu target end-to-end:**

- Login → Generate → Review → Cetak = **< 5 menit**
- Koreksi per murid (20 soal) = **< 1 menit**
- Koreksi satu kelas (30 murid) = **< 30 menit**

---

## 10. Hackathon AI Enhancements (Post-MVP)

> **Strategi:** Selesaikan MVP terlebih dahulu (flow §9: Login → Generate → Review → Preview/Cetak → Koreksi). Setelah end-to-end berjalan, layer tiga fitur AI berikut di atas arsitektur yang sudah ada. **Tidak perlu perubahan arsitektur** — hanya tambahan Claude API call dan UI minor.

### 10.1 Ringkasan Fitur


| #   | Fitur                                           | Tujuan                                                                                                           | Plug-in Point                                                                    | Estimasi |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| 1   | **Penjaga Kurikulum** (AI Curriculum Validator) | Validasi otomatis tiap soal terhadap CP/TP Kurikulum Merdeka untuk memastikan kesesuaian materi & level kognitif | Setelah generate, sebelum/saat Review (US-9/9b) — tambah badge validasi per soal | ~2-3 jam |
| 2   | **Adaptive Difficulty** (Class Context)         | Sesuaikan tingkat kesulitan & konteks soal berdasarkan deskripsi karakteristik kelas dari guru                   | Form Generate (US-8) — tambah field opsional "Deskripsi kelas"                   | ~1-2 jam |
| 3   | **Pembahasan Generator**                        | Hasilkan pembahasan/penjelasan tiap soal sebagai bahan diskusi/remedial                                          | Setelah finalize, di samping Kunci Jawaban (US-16) — halaman cetak baru          | ~2-3 jam |


**Total estimasi: ~5-8 jam** setelah MVP selesai.

---

### 10.2 Fitur 1 — Penjaga Kurikulum (AI Curriculum Validator)

**Masalah yang dipecahkan:**
Guru tidak punya cara cepat memverifikasi apakah soal hasil AI benar-benar sesuai CP/TP Kurikulum Merdeka. Tanpa validasi, ada risiko soal "menyimpang" dari capaian pembelajaran resmi.

**Solusi:**
Setelah generate, jalankan Claude API call kedua yang me-review tiap soal terhadap data CP/TP yang sudah ada di **§8 PRD ini** (sudah hardcoded — itu reference sempurna untuk validator).

**Output per soal:**

- ✅ **Sesuai** — soal cocok dengan CP/TP & level kognitif yang dipilih
- ⚠️ **Perlu review** — ada ketidaksesuaian minor (mis. level kognitif terlalu tinggi/rendah)
- ❌ **Tidak sesuai** — soal keluar dari topik atau melenceng dari CP

Disertai **alasan singkat** (1-2 kalimat) per badge.

**UI Integration:**

- Di Review (US-9/9b), tampilkan badge di pojok kanan atas tiap kartu soal.
- Tambah filter "Tampilkan hanya yang perlu review" untuk fokus revisi.
- Badge bersifat **advisory** — guru tetap punya keputusan final (sesuai prinsip §1: Teacher always in control).

**Teknis:**

- Reuse data CP/TP & matriks kesulitan dari **§8.1, §8.2, §8.3, §8.4**.
- 1 Claude API call (batch validate semua soal sekaligus untuk hemat token).
- Async — jalan paralel dengan render Review, tidak blok UX.

---

### 10.3 Fitur 2 — Adaptive Difficulty (Class Context)

**Masalah yang dipecahkan:**
Kelas A mungkin lebih kuat di literasi, kelas B lebih lemah di numerasi. Soal "satu ukuran untuk semua" tidak adil & kurang efektif sebagai diagnostik.

**Solusi:**
Tambah satu field opsional di form Generate (US-8):

> **Deskripsi kelas (opsional)** — *textarea*
> Contoh: "Kelas 4B, mayoritas sudah lancar membaca tapi masih lemah di soal cerita matematika. Banyak yang ESL (bahasa pertama bahasa daerah)."

Konteks ini di-inject ke prompt generator sehingga AI:

- Sesuaikan kompleksitas bahasa
- Pilih konteks lokal yang relevan
- Adjust proporsi level kesulitan jika perlu

**UI Integration:**

- Field opsional, muncul di form Generate setelah field standar (mata pelajaran, jumlah soal, level).
- Placeholder dengan contoh agar guru paham cara mengisi.
- Disimpan ke `exams.class_context` (kolom baru, nullable) untuk audit & re-generate.

**Teknis:**

- Modifikasi prompt template existing — tidak butuh API call tambahan.
- Validasi: max 500 karakter agar tidak boros token.

---

### 10.4 Fitur 3 — Pembahasan Generator

**Masalah yang dipecahkan:**
Kunci jawaban hanya menunjukkan jawaban benar, tidak menjelaskan **kenapa**. Guru harus menyiapkan pembahasan manual untuk diskusi pasca-ujian atau remedial.

**Solusi:**
Setelah finalize (US-13/14), tambah opsi cetak baru: **📖 Lembar Pembahasan**.

Untuk tiap soal, AI menghasilkan:

- Jawaban benar
- **Penjelasan singkat** (2-4 kalimat) kenapa jawaban itu benar
- **Mengapa opsi lain salah** (untuk PG) — opsional, jika muat
- Tip belajar/konsep kunci (1 kalimat)

**UI Integration:**

- Di halaman Preview & Cetak (US-14-18), tambah card baru di samping "Kunci Jawaban":
  - 📄 Lembar Soal
  - 📝 Lembar Jawaban (×N)
  - 🔑 Kunci Jawaban
  - 📖 **Lembar Pembahasan** *(baru)*
- Di Riwayat (US-17), tambah tombol "Cetak Pembahasan" sebagai aksi terpisah.
- Generate on-demand (tidak otomatis saat finalize, untuk hemat token & waktu).

**Teknis:**

- 1 Claude API call dengan input: list soal final + jawaban kunci.
- Hasil disimpan ke `exams.discussion_md` (kolom baru, nullable, markdown).
- Layout cetak A4: judul + per-soal block (soal → jawaban → penjelasan), page-break otomatis.

---

### 10.5 Update User Flow (dengan Hackathon Features)

```
┌──────────┐    ┌───────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Login   │───►│ Dashboard │───►│    Generate      │───►│     Review      │
│ (Google) │    │  (US-2)   │    │ + Class Context  │    │ + Penjaga       │
│          │    │           │    │   (Fitur 2)      │    │   Kurikulum     │
│          │    │           │    │   (US-8)         │    │   (Fitur 1)     │
└──────────┘    └─────▲─────┘    └──────────────────┘    │   (US-9/9b)     │
                      │                                  └────────┬────────┘
                      │                                           │
                ┌─────┴─────┐    ┌──────────┐    ┌────────────────▼─────────┐
                │  Riwayat  │◄───│ Koreksi  │◄───│      Preview & Cetak     │
                │  (US-17)  │    │(US-19/20)│    │  📄 Soal                 │
                └───────────┘    └──────────┘    │  📝 Lembar Jawaban (×N)  │
                                                 │  🔑 Kunci Jawaban        │
                                                 │  📖 Pembahasan (Fitur 3) │
                                                 │     (US-14-18)           │
                                                 └──────────────────────────┘
```

---

### 10.6 Prinsip Implementasi

1. **MVP first, enhancements later** — jangan mulai fitur §10 sebelum flow §9 berjalan end-to-end.
2. **Tidak ada perubahan arsitektur** — semua fitur cuma menambah Claude API call + kolom DB nullable + UI minor.
3. **Backward compatible** — kalau fitur §10 di-disable (mis. quota habis), MVP tetap jalan normal.
4. **Teacher always in control** — semua output AI (badge validasi, pembahasan) bersifat advisory dan editable.
5. **Hemat token** — batch API call jika memungkinkan, generate on-demand untuk fitur opsional.

---

### 10.7 Acceptance Criteria Ringkas

**Fitur 1 — Penjaga Kurikulum:**

- Setelah generate, badge muncul di tiap soal di Review dalam < 5 detik
- Tiga state badge (✅ / ⚠️ / ❌) dengan alasan singkat
- Filter "tampilkan yang perlu review" berfungsi
- Validator menggunakan data CP/TP dari §8

**Fitur 2 — Adaptive Difficulty:**

- Field "Deskripsi kelas" muncul di form Generate (opsional, max 500 char)
- Konteks ter-inject ke prompt & berpengaruh ke output (uji A/B manual)
- Tersimpan di DB & muncul kembali saat re-generate dari Riwayat

**Fitur 3 — Pembahasan Generator:**

- Tombol "Cetak Pembahasan" muncul di Preview & Riwayat
- Generate < 15 detik untuk 20 soal
- Layout cetak A4 rapi, page-break otomatis
- Tersimpan di DB agar tidak generate ulang

