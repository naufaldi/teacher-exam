# Product Requirements Document — Monetize (Free / Pro)

## School Exam Generator (Ujian SD) — Subscription & Feature Gates

| Field             | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **Product Name**  | School Exam Generator (Ujian SD)                                      |
| **Version**       | M-1 (Monetize)                                                        |
| **Date**          | 2026-07-09                                                            |
| **Status**        | Draft (research eval stage — does not assume ship to `main`)          |
| **Baseline**      | PRD v2 (MVP), PRD v8 (Generate PDF Enhancement), ROADMAP M1–M7        |
| **Theme**         | [monetize-2026/theme-brief.md](../theme-brief.md)                     |

---

## 1. Executive Summary

### 1.1 Problem Statement

Ujian SD saat ini **tidak punya jalur bayar**. Setiap guru yang login via Google dapat meng-generate lembar soal tanpa batas, meng-upload PDF materi ke R2, memakai mode `combine`, mengekspor PDF/DOCX, dan memBank soal tanpa biaya. Model ini tidak berkelanjutan karena setiap generate memanggil AI berbayar (Anthropic / MiniMax / OpenAI) dengan biaya token nyata, sementara pendapatan produk nol.

Pain yang dihadapi:

- **Biaya AI tidak tertutup** — setiap lembar (20–50 soal) menghabiskan token AI; tanpa tier berbayar, skala pengguna langsung menjadi kerugian.
- **Tidak ada diferensiasi nilai** — guru yang butuh fitur lanjut (PDF guru, ekspor file, koreksi mendalam) tidak punya alasan membayar karena semua sudah gratis.
- **Tidak ada gating yang adil** — `AI_GENERATE_RATE_WINDOWS` (5/menit, 30/hari, in-memory di `rate-limit-core.ts`) adalah batas teknis anti-spam, bukan batas produk. Saat aplikasi scale up, batas ini tidak persisten dan reset tiap restart server.
- **Guru coba produk tanpa komitmen** — tidak ada jalur "coba dulu, bayar kalau perlu lebih" yang jelas.
- **Siklus tahun ajaran Indonesia** — guru SD mempersiapkan UTS/UAS tiap semester (Ganjil/Genap). Penagihan yang selaras siklus ini lebih relevan daripada langganan SaaS generik bulanan.

### 1.2 Solution

Perkenalkan **dua tier** dengan model **hibrida: batas kuota + gerbang fitur**.

| Tier | Intent |
|------|--------|
| **Free** | Core loop "buat lembar ujian" tetap berfungsi: generate mode Buku Siswa (default) dengan kuota bulanan, cetak via browser, bank soal terbatas. Guru mencoba produk tanpa kartu kredit. |
| **Pro** | Membuka gerbang: kuota generate tinggi, mode PDF guru + combine, perpustakaan PDF, ekspor file PDF/DOCX, bank soal tanpa batas, template tanpa batas, AI prioritas. |

**Prinsip gerbang:** batas Free menjaga core loop (generate → review → cetak) tetap berjalan. Pro tidak membuat kelangkaan buatan — Pro membuka fitur yang benar-benar memerlukan biaya tambahan (AI token, R2 storage, compute) atau nilai lanjutan (ekspor, koreksi mendalam).

**Payment provider distub di batas (boundary)** pada fase awal: antarmuka `PaymentProvider` (Effect `Context.Tag`) dengan implementasi stub untuk dev/eval, dan provider nyata (QRIS / Virtual Account / e-wallet via Midtrans/Xendit) untuk produksi. Hal ini sesuai theme-brief: "Payment provider may be stubbed at boundaries in early phases."

### 1.3 Target

- **Pengguna:** Guru SD Kelas 1–6 yang sudah terdaftar (better-auth / Google OAuth)
- **Konteks harga:** Price-sensitive Indonesia; Pro harus terjangkau (~Rp 49.000/bulan, setara pulsa/bensin seminggu)
- **Metode bayar:** QRIS, Virtual Account (BCA/Mandiri/BRI), e-wallet (GoPay, OVO, DANA, ShopeePay) — bukan kartu kredit sebagai utama
- **Siklus:** Bulanan dengan opsi tahunan (selaras tahun ajaran: Juli–Juni)

---

## 2. Goals & Non-Goals

### 2.1 Goals

| # | Goal | Cara Ukur |
|---|------|-----------|
| G1 | Free tier menjaga core loop berfungsi tanpa pembayaran | Guru Free dapat generate ≥1 lembar/bulan, cetak, dan bank ≤5 lembar |
| G2 | Pro memberikan nilai yang jelas dan adil (bukan kelangkaan buatan) | Konversi Free→Pro ≥3% dalam 3 bulan pasca-launch |
| G3 | Kuota generate persisten di DB (bukan in-memory) | Reset server tidak menghilangkan hitungan kuota bulanan |
| G4 | Payment boundary yang dapat distub | `PaymentProvider` Effect service dengan stub yang mengembalikan `succeeded` di dev |
| G5 | Gating via API + schema aditif (tidak rewrite generate) | Generate handler hanya ditambah pengecekan plan sebelum eksekusi |
| G6 | UI Indonesia: badge paket, sisa kuota, CTA upgrade | Browser verify: dashboard menampilkan "Paket: Free · Sisa: 3 lembar" |
| G7 | DEV_AUTH lokal tetap berfungsi untuk dev/testing | Guru Dev mendapat plan `pro` otomatis (lihat EC-E1) |

### 2.2 Non-Goals

| Non-Goal | Alasan |
|----------|--------|
| Multi-tenant school district billing | Out of scope theme-brief |
| Student-facing payments | Murid bukan pengguna produk |
| Marketplace soal packs sebagai monetize utama | Out of scope theme-brief |
| Curriculum corpus licensing sebagai paywall | Out of scope theme-brief |
| Mengganti loop generate → review → export | Gating aditif saja |
| Aplikasi kedua / greenfield rewrite | Harus di atas stack现有 (Effect, Drizzle, better-auth) |
| Full production billing hardening di MVP pertama | Payment stub di batas diperbolehkan |
| Webhook reconciliation penuh untuk multi-provider | Satu provider (QRIS/VA) cukup untuk MVP |
| Auto-scaling / infra billing metering | Bukan scope produk |
| Refund flow otomatis | Manual via admin di MVP |

---

## 3. Free vs Pro Matrix

### 3.1 Fitur & Batas

| Fitur | Seams di kode | Free | Pro |
|-------|---------------|------|-----|
| **Generate — mode `default` (Buku Siswa)** | `GenerateExamInputSchema.sourceMode`, `exams.sourceMode` | ✅ 5 lembar/bulan | ✅ 50 lembar/bulan |
| **Generate — mode `pdf_guru` (PDF saya saja)** | `SourceModeSchema` | ❌ Dikunci | ✅ |
| **Generate — mode `combine` (Buku Siswa + PDF)** | `SourceModeSchema` | ❌ Dikunci | ✅ |
| **Perpustakaan PDF (R2 library)** | PRD v8 F2, `pdf-uploads.ts` | ❌ | ✅ Tanpa batas (maks 50 PDF) |
| **Cetak via browser (print)** | US-15 PRD v2 | ✅ | ✅ |
| **Ekspor file PDF/DOCX** | `ExportsGroup`, `export-service.ts` | ❌ | ✅ |
| **Bank Soal (simpan lembar)** | `BankGroup`, `bank-service.ts`, D-2 | ✅ Maks 5 lembar | ✅ Tanpa batas |
| **Templates (template lembar)** | `TemplatesGroup`, `exam-templates.ts` | ✅ Maks 3 | ✅ Tanpa batas |
| **Bagikan lembar publik (`/share/:slug`)** | D-4, `PublicExamsGroup` | ✅ | ✅ |
| **Pembahasan (discussion_md)** | §10.4 PRD v2 | ✅ | ✅ |
| **Periksa kurikulum** | `validate-curriculum` | ✅ | ✅ |
| **Koreksi cepat (client-side)** | US-19 PRD v2 | ✅ | ✅ |
| **Koreksi persisten + item analysis (M5)** | `sessions.ts`, `results.ts`, PRD v5 | ❌ Fase 2 | ✅ |
| **Delivery (ujian online)** | `DELIVERY_ENABLED`, `SessionsGroup` | ❌ Fase 2 | ✅ |
| **Analytics / weakness analysis (M6)** | `AnalyticsGroup`, PRD v6 | ❌ Fase 2 | ✅ |
| **AI prioritas (model lebih cepat/akurat)** | `AiLayer`, `AI_PROVIDER` | Standard | Priority |
| **Gambar dari PDF di soal** | PRD v8 F5, `includePdfImages` | ❌ | ✅ |
| **Streaming + durable jobs** | PRD v8 F5, `generation-jobs.ts` | ❌ | ✅ |

### 3.2 Kuota Generate (persisten di DB)

| Paket | Lembar/bulan | Reset | Burst (per menit) |
|-------|-------------|-------|--------------------|
| Free | 5 | Awal bulan kalender (tgl 1) | 3/menit (anti-spam) |
| Pro | 50 | Awal bulan kalender | 10/menit |

> **Catatan:** Batas in-memory saat ini (`AI_GENERATE_RATE_WINDOWS`: 5/menit, 30/hari) tetap berlaku sebagai **burst protection** di atas kuota bulanan persisten. Kuota bulanan disimpan di tabel `usage` (lihat §4.1) dan tidak hilang saat restart server.

### 3.3 Harga

| Paket | Harga | Periode | Catatan |
|-------|-------|---------|---------|
| Free | Rp 0 | Selamanya | Tanpa kartu |
| Pro Bulanan | Rp 49.000 | /bulan | Dapat dibatalkan kapan saja |
| Pro Tahunan | Rp 399.000 | /tahun (12 bln, hemat ~18%) | Selaras tahun ajaran (Jul–Jun) |
| Pro Trial | Rp 0 | 14 hari | Sekali per akun, akses Pro penuh |

---

## 4. User Stories

Setiap story mencantumkan **fase implementasi minimum** (P0 = MVP Code, P1 = pasca-MVP).

### Epic 1: Paket & Langganan

#### US-M1 — Lihat status paket di Dashboard

> **Sebagai** guru, **saya ingin** melihat paket saya (Free/Pro) dan sisa kuota generate di Dashboard **agar** tahu kapan perlu upgrade.

**Phase:** P0

**Acceptance criteria:**

- [ ] Dashboard menampilkan badge: **"Paket: Free"** atau **"Paket: Pro"**
- [ ] Untuk Free: tampilkan **"Sisa generate: X dari 5 lembar bulan ini"**
- [ ] Untuk Pro: tampilkan **"Sisa generate: X dari 50 lembar bulan ini"**
- [ ] Saat sisa ≤ 1, badge berubah warna (warning) + tombol **"Upgrade ke Pro"**
- [ ] Data paket di-fetch dari `GET /api/me` (respons `UserProfile` diperluas dengan field `plan`, `quotaRemaining`, `currentPeriodEnd`)
- [ ] Tidak ada console error/warning saat load dashboard

#### US-M2 — Upgrade ke Pro (alur pembayaran)

> **Sebagai** guru Free, **saya ingin** upgrade ke Pro via QRIS/e-wallet **agar** membuka fitur lanjutan tanpa kartu kredit.

**Phase:** P0 (stub), P1 (provider nyata)

**Acceptance criteria:**

- [ ] Tombol **"Upgrade ke Pro"** di Dashboard → halaman `/billing/upgrade`
- [ ] Pilihan: **Pro Bulanan (Rp 49.000/bln)** atau **Pro Tahunan (Rp 399.000/thn)**
- [ ] Metode bayar: QRIS, Virtual Account, e-wallet (P1 nyata; P0 stub `PaymentProvider.checkout()` mengembalikan `succeeded`)
- [ ] Setelah pembayaran sukses: `subscription.status = "active"`, `plan = "pro"`, `currentPeriodStart/End` di-set
- [ ] Redirect kembali ke Dashboard dengan badge **"Paket: Pro"** dan toast "Selamat! Paket Pro aktif"
- [ ] Gagal bayar (P1): tetap di halaman upgrade dengan pesan error + tombol coba lagi

#### US-M3 — Kelola langganan (batalkan / downgrade)

> **Sebagai** guru Pro, **saya ingin** membatalkan langganan **agar** tidak dikenakan biaya bulan berikutnya tanpa kehilangan akses langsung.

**Phase:** P0

**Acceptance criteria:**

- [ ] Halaman `/billing` menampilkan status langganan: paket, periode berjalan, metode bayar
- [ ] Tombol **"Batalkan langganan"** → konfirmasi dialog → `subscription.cancelAtPeriodEnd = true`
- [ ] Setelah cancel: akses Pro **tetap aktif sampai `currentPeriodEnd`** (proration adil)
- [ ] Setelah `currentPeriodEnd` lewat: `plan` turun ke `free`, `status = "canceled"` (bukan `active`)
- [ ] UI menampilkan: **"Langganan dibatalkan — akses Pro aktif sampai [tanggal]"**

#### US-M4 — Trial Pro 14 hari

> **Sebagai** guru Free baru, **saya ingin** mencoba Pro gratis 14 hari **agar** bisa menilai apakah fitur Pro worth dibayar.

**Phase:** P1

**Acceptance criteria:**

- [ ] Guru yang belum pernah trial dapat memulai trial dari Dashboard
- [ ] Trial: `plan = "pro"`, `status = "trialing"`, `trialEnd = now + 14 hari`
- [ ] Saat `trialEnd` lewat tanpa konversi: otomatis turun ke Free
- [ ] Sekali per akun (flag `hasUsedTrial` di `subscriptions`)
- [ ] Notifikasi email 3 hari sebelum trial berakhir (P1, butuh email service)

### Epic 2: Kuota & Gerbang Generate

#### US-M5 — Generate dengan batas bulanan (Free)

> **Sebagai** guru Free, **saya ingin** meng-generate lembar dengan kuota bulanan **agar** bisa mencoba produk tanpa bayar, tapi tahu ada batasnya.

**Phase:** P0

**Acceptance criteria:**

- [ ] `POST /api/ai/generate` mengecek `subscription.plan` + `usage.generateCount` bulan ini
- [ ] Free: jika `generateCount >= 5` → `403 PlanQuotaExhausted` dengan body `{ error, code: "QUOTA_EXHAUSTED", remaining: 0, limit: 5, resetAt }`
- [ ] Web menampilkan banner: **"Kuota generate bulan ini habis (0/5). Upgrade ke Pro untuk 50 lembar/bulan."** + tombol CTA
- [ ] Generate sukses → `usage.generateCount` di-increment (transaksi DB)
- [ ] Reset otomatis tanggal 1 setiap bulan (job atau lazy-check `periodStart`)
- [ ] Burst rate-limit in-memory tetap berlaku di atas kuota (anti-spam, tidak persisten)

#### US-M6 — Mode PDF guru & combine dikunci untuk Free

> **Sebagai** guru Free, **saya ingin** tahu bahwa mode PDF guru dan combine adalah fitur Pro **agar** saya tidak frustrasi mencoba fitur yang dikunci.

**Phase:** P0

**Acceptance criteria:**

- [ ] Di halaman `/generate`, selector source mode: `default` aktif; `pdf_guru` dan `combine` **disabled** dengan badge **"Pro"** dan tooltip "Upgrade untuk upload PDF sendiri"
- [ ] Jika Free mencoba `POST /api/ai/generate` dengan `sourceMode != "default"` → `403 FeatureNotInPlan` dengan `{ error, code: "PLAN_RESTRICTED", feature: "source_mode_pdf_guru", requiredPlan: "pro" }`
- [ ] CTA "Upgrade ke Pro" muncul di samping mode yang dikunci
- [ ] Pro: ketiga mode aktif tanpa batas tambahan

#### US-M7 — Generate tanpa batas efektif (Pro)

> **Sebagai** guru Pro, **saya ingin** meng-generate hingga 50 lembar/bulan **agar** cukup untuk seluruh semester tanpa khawatir kehabisan.

**Phase:** P0

**Acceptance criteria:**

- [ ] Pro: `generateCount` limit = 50/bulan (bukan unlimited — melindungi biaya AI)
- [ ] Dashboard Pro menampilkan "Sisa: X dari 50 lembar"
- [ ] Jika Pro mencapai 50: banner ramah "Anda telah mencapai batas 50 lembar bulan ini. Hubungi kami untuk paket sekolah." (bukan hard error — tetap bisa lihat/edit lembar lama)

### Epic 3: Fitur Pro — Ekspor & Bank

#### US-M8 — Ekspor PDF/DOCX (Pro)

> **Sebagai** guru Pro, **saya ingin** mengekspor lembar ke file PDF/DOCX **agar** bisa simpan/arsip digital tanpa browser print.

**Phase:** P0

**Acceptance criteria:**

- [ ] Tombol **"Ekspor PDF"** dan **"Ekspor DOCX"** di halaman `/preview` hanya aktif untuk Pro
- [ ] Free: tombol disabled dengan badge "Pro" + tooltip "Upgrade untuk ekspor file"
- [ ] Jika Free via API `GET /api/exports/:examId?format=pdf` → `403 FeatureNotInPlan`
- [ ] Pro: ekspor menghasilkan file download (menggunakan `ExportServiceLive` existing)
- [ ] Browser print tetap tersedia untuk semua paket (Free + Pro)

#### US-M9 — Bank soal tanpa batas (Pro)

> **Sebagai** guru Pro, **saya ingin** menyimpan lembar ke bank soal tanpa batas **agar** bisa membangun koleksi ujian lintas semester.

**Phase:** P0

**Acceptance criteria:**

- [ ] Free: `POST /api/bank/sheets` (finalize → bank) dibatasi maks 5 lembar banked
- [ ] Free saat mencoba bank lembar ke-6 → `403 FeatureNotInPlan` dengan CTA upgrade
- [ ] UI Bank Soal Free menampilkan "5/5 lembar — Upgrade untuk tanpa batas"
- [ ] Pro: tanpa batas bank soal
- [ ] Browse bank publik (`/bank-soal-publik`) tetap untuk semua paket

#### US-M10 — Templates tanpa batas (Pro)

> **Sebagai** guru Pro, **saya ingin** membuat template lembar tanpa batas **agar** bisa standardisasi format ujian antar kelas/mapel.

**Phase:** P1

**Acceptance criteria:**

- [ ] Free: maks 3 templates (`POST /api/templates`)
- [ ] Free saat mencoba buat template ke-4 → `403 FeatureNotInPlan`
- [ ] Pro: tanpa batas templates

### Epic 4: Notifikasi & Billing Admin

#### US-M11 — Notifikasi batas kuota tercapai

> **Sebagai** guru Free, **saya ingin** tahu saat kuota generate hampir habis **agar** bisa upgrade sebelum kehabisan saat UTS/UAS.

**Phase:** P0

**Acceptance criteria:**

- [ ] Saat `remaining <= 1`: banner di Dashboard + halaman generate: "Kuota generate hampir habis (X/5). Upgrade ke Pro."
- [ ] Saat `remaining == 0`: banner penuh dengan CTA, tombol generate disabled + tooltip
- [ ] Tidak ada notifikasi push/email di P0 (P1: email 3 hari sebelum reset bulanan)

#### US-M12 — Halaman billing & riwayat

> **Sebagai** guru Pro, **saya ingin** melihat riwayat pembayaran dan status langganan **agar** transparan dan bisa klaim reimbursement sekolah.

**Phase:** P1

**Acceptance criteria:**

- [ ] Halaman `/billing` menampilkan: paket aktif, periode, metode bayar, tombol cancel
- [ ] Tabel riwayat transaksi: tanggal, jumlah, metode, status, ID transaksi
- [ ] Tombol **"Unduh faktur"** (PDF sederhana, P1)

---

## 5. Edge Cases

Format: **ID → Condition → Expected UI → Expected system**

### A. Kuota & generate

| ID | Condition | UI | System |
| -- | --------- | -- | ------ |
| EC-A1 | Free, kuota habis, klik Generate | Banner "Kuota habis (0/5)" + CTA upgrade; tombol generate disabled | `403 PlanQuotaExhausted` |
| EC-A2 | Free, kuota 4/5, generate sukses | Banner "Sisa 1 lembar" muncul | `usage.generateCount` increment ke 5 |
| EC-A3 | Free, coba `sourceMode=pdf_guru` via API langsung | — | `403 FeatureNotInPlan` (`PLAN_RESTRICTED`) |
| EC-A4 | Pro, kuota 50/50, klik generate | Banner ramah "Batas bulan ini tercapai" — generate diblok, tapi lihat/edit lembar lama tetap jalan | `403 PlanQuotaExhausted` (Pro limit, hanya pada endpoint generate) |
| EC-A5 | Free, generate gagal di AI (timeout/invalid) | Error existing; kuota tidak berkurang | `usage.generateCount` hanya increment saat lembar tersimpan di DB |
| EC-A6 | Race: dua request generate bersamaan dari akun yang sama | Salah satu dapat error kuota | Transaksi DB + row-lock pada `usage` |
| EC-A7 | Reset bulanan: tanggal 1, kuota tidak reset otomatis | Dashboard refresh menampilkan kuota baru | Lazy-check: `currentPeriodStart` < awal bulan ini → reset count |

### B. Perubahan paket

| ID | Condition | UI | System |
| -- | --------- | -- | ------ |
| EC-B1 | Upgrade Free→Pro mid-bulan | Badge langsung "Pro"; kuota Pro (50) langsung aktif | `subscription` update: `plan=pro, status=active, currentPeriodEnd=+1bln` |
| EC-B2 | Cancel Pro (cancelAtPeriodEnd) | "Langganan dibatalkan — Pro aktif sampai [tanggal]" | `cancelAtPeriodEnd=true`, akses tetap Pro sampai `currentPeriodEnd` |
| EC-B3 | Setelah `currentPeriodEnd` lewat (canceled) | Badge "Free"; fitur Pro disabled | Cron/lazy-check: `status=canceled, plan=free` |
| EC-B4 | Downgrade Pro→Free langsung (admin manual) | Badge "Free" segera | Admin endpoint `POST /api/billing/:userId/force-free` |
| EC-B5 | Upgrade saat trial berjalan | Trial berakhir langsung; periode Pro dimulai | `trialEnd=null, status=active, currentPeriodStart=now` |
| EC-B6 | Trial berakhir, tidak konversi | Badge "Free"; fitur Pro disabled | Lazy-check `trialEnd < now` → `plan=free, status=trial_expired` |

### C. Pembayaran gagal

| ID | Condition | UI | System |
| -- | --------- | -- | ------ |
| EC-C1 | Pembayaran QRIS expired (P1) | "Pembayaran kedaluwarsa. Coba lagi." | `payment.status=expired`; subscription tidak dibuat |
| EC-C2 | Pembayaran ditolak bank (P1) | "Pembayaran ditolak. Coba metode lain." | `payment.status=failed`; subscription tidak dibuat |
| EC-C3 | Pembayaran sukses tapi webhook delayed | Status pending; setelah webhook, auto-activate | Webhook reconciliation: `payment.status=succeeded` → activate subscription |
| EC-C4 | Pembayaran sukses, subscription gagal dibuat | "Pembayaran diterima, aktivasi tertunda. Hubungi support." | Log error + admin manual activate |
| EC-C5 | Refund diminta | Manual via admin (P0) | Admin endpoint `POST /api/billing/:userId/refund` → `plan=free` |

### D. Penyalahgunaan (abuse)

| ID | Condition | UI | System |
| -- | --------- | -- | ------ |
| EC-D1 | Akun ganda (multi-account) untuk kuota Free berlebih | — | Tidak dicegah di MVP (P0); P1: deteksi email serupa / device fingerprint |
| EC-D2 | Akun Pro dishare antar guru | — | Toleransi di MVP; P1: concurrent session limit (max 3 sesi aktif) |
| EC-D3 | Spam generate untuk habiskan kuota Pro | — | Burst rate-limit in-memory tetap berlaku (10/menit Pro) |
| EC-D4 | Trial abuse (buat akun baru untuk trial lagi) | — | `user.email` + `hasUsedTrial` flag; tidak bisa trial kedua kalinya dengan email sama |
| EC-D5 | API abuse: bypass UI, kirim request langsung | — | Server-side gating di handler (bukan hanya UI disable) |

### E. Offline / DEV_AUTH

| ID | Condition | UI | System |
| -- | --------- | -- | ------ |
| EC-E1 | DEV_AUTH_ENABLED, guru Dev login | Badge "Pro (Dev)" | `subscription` auto-seeded: `plan=pro, status=dev_grant` via `pnpm db:seed:dev` |
| EC-E2 | DEV_AUTH di production (tidak boleh) | — | `DEV_AUTH_ENABLED` wajib false di prod; `seed:dev` tidak ada di prod env |
| EC-E3 | Guru tanpa baris subscription (data lama) | Default Free | Lazy-create: jika `subscription` row tidak ada, treat sebagai `plan=free, status=free` |
| EC-E4 | `subscription.currentPeriodEnd` null (Free) | — | Free tidak punya periode; `currentPeriodEnd=null` valid untuk Free |
| EC-E5 | Webhook payment di dev (tidak ada provider nyata) | — | Stub `PaymentProvider` mengembalikan `succeeded` tanpa webhook |

### F. Data & integritas

| ID | Condition | UI | System |
| -- | --------- | -- | ------ |
| EC-F1 | Lembar banked Free, lalu downgrade Pro→Free (bank > 5) | Bank soal read-only untuk lembar > 5; tidak bisa bank baru | Tidak hapus data; hanya gate aksi baru |
| EC-F2 | Template Free (3), lalu downgrade Pro→Free (template > 3) | Templates read-only; tidak bisa buat baru | Sama: gate aksi, tidak hapus data |
| EC-F3 | PDF library Pro (50 PDF), downgrade Free | PDF tidak dihapus; tidak bisa upload baru | Soft-gate, retention data |
| EC-F4 | Migration: user eksisting tanpa subscription row | Default Free, semua data tetap | Lazy-create subscription row pada akses pertama |

---

## 6. Acceptance Criteria / Definition of Done (MVP — P0)

### 6.1 Data layer

- [ ] Migration: tabel `subscriptions` (`id`, `userId` FK, `plan` enum, `status` enum, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `trialEnd`, `hasUsedTrial`, `paymentProvider`, `externalSubscriptionId`, timestamps) — di `packages/db/src/schema/`
- [ ] Migration: tabel `usage` (`id`, `userId` FK, `periodStart`, `periodEnd`, `generateCount`, `bankedCount`, `templateCount`) — satu baris per user per periode
- [ ] Enum `plan`: `'free' | 'pro'` di `packages/db/src/schema/enums.ts`
- [ ] Enum `subscription_status`: `'free' | 'trialing' | 'active' | 'canceled' | 'trial_expired' | 'past_due' | 'dev_grant'`
- [ ] `pnpm db:generate` menghasilkan migration file bersih
- [ ] `pnpm db:migrate` berjalan sukses pada DB dev

### 6.2 Schema (Effect Schema — packages/shared)

- [ ] `SubscriptionSchema`, `UsageSchema` di `packages/shared/src/schemas/entities.ts` (branded IDs: `SubscriptionIdSchema`, `UsageIdSchema`)
- [ ] `PlanSchema = Schema.Literal('free', 'pro')` di `primitives.ts`
- [ ] `UserProfileSchema` diperluas: `plan: PlanSchema`, `quotaRemaining: Schema.Int`, `currentPeriodEnd: Schema.NullOr(Schema.String)` (optional, backward-compatible)
- [ ] Error schemas: `PlanQuotaExhausted` (`Schema.TaggedError` + `HttpApiSchema.annotations({ status: 403 })`), `FeatureNotInPlan` (sama) di `apps/api/src/api/errors/http.ts`
- [ ] `pnpm type-check` lulus lintas paket

### 6.3 Service layer (apps/api)

- [ ] `SubscriptionService` (`Context.Tag`) di `apps/api/src/api/services/subscription-service.ts` — method: `getPlan(userId)`, `getUsage(userId)`, `incrementGenerate(userId)`, `incrementBanked(userId)`, `canAccessFeature(userId, feature)`, `checkQuota(userId)`
- [ ] `PaymentProvider` (`Context.Tag`) di `apps/api/src/api/services/payment-provider.ts` — method: `checkout(plan, period)`, `handleWebhook(payload)`. Stub impl: `PaymentProviderStubLive` mengembalikan `{ status: 'succeeded' }`
- [ ] `SubscriptionServiceLive` di-compose di `AppLayer.ts` (`Layer.provide(getSharedDatabaseLayer())`)
- [ ] `PaymentProviderStubLive` di-compose di `AppLayer.ts`
- [ ] `pnpm effect:check` lulus

### 6.4 API gates

- [ ] `POST /api/ai/generate` handler: sebelum eksekusi, panggil `subscriptionService.checkQuota(userId)` + `canAccessFeature(userId, sourceMode)`. Gagal → `403`
- [ ] `POST /api/bank/sheets` (finalize→bank): cek `bankedCount` vs limit paket
- [ ] `GET /api/exports/:examId?format=pdf|docx`: cek `plan === 'pro'`
- [ ] `GET /api/me`: respons menyertakan `plan`, `quotaRemaining`, `currentPeriodEnd`
- [ ] Grup API baru: `BillingGroup` (`groups/billing.ts`) dengan endpoint `POST /api/billing/checkout`, `POST /api/billing/cancel`, `GET /api/billing/status`
- [ ] Semua gating server-side (bukan hanya UI disable) — EC-D5

### 6.5 Web UI

- [ ] Dashboard: badge paket + sisa kuota (fetch dari `/api/me`)
- [ ] Halaman `/generate`: source mode selector disable `pdf_guru`/`combine` untuk Free + badge "Pro"
- [ ] Halaman `/preview`: tombol ekspor PDF/DOCX disabled untuk Free + badge "Pro"
- [ ] Halaman `/billing/upgrade`: pilihan Bulanan/Tahunan + CTA (P0 stub checkout)
- [ ] Banner kuota habis (EC-A1) dengan CTA upgrade
- [ ] API client (`apps/web/src/lib/api/`) handle `403 PlanQuotaExhausted` → tampilkan banner upgrade
- [ ] Tidak ada console error/warning (browser verification)
- [ ] Tidak ada `console.log` tersisa di diff

### 6.6 DEV_AUTH & seeding

- [ ] `pnpm db:seed:dev` membuat `subscription` row `plan=pro, status=dev_grant` untuk guru dev
- [ ] `DEV_AUTH_ENABLED=true` + guru dev login → badge "Pro (Dev)"
- [ ] `DEV_AUTH_ENABLED=false` di production (assert di startup atau config)

### 6.7 Testing (TDD — wajib)

- [ ] `subscription-service.test.ts`: `getPlan` returns free untuk user tanpa row; `checkQuota` returns false saat `generateCount >= limit`; `incrementGenerate` di-increment dalam transaksi
- [ ] `billing.test.ts` (route): `POST /api/ai/generate` Free dengan kuota habis → `403 PlanQuotaExhausted`; Free dengan `sourceMode=pdf_guru` → `403 FeatureNotInPlan`; Pro → `200`
- [ ] `me.test.ts`: `GET /api/me` menyertakan `plan` + `quotaRemaining`
- [ ] `_auth.dashboard.test.tsx`: badge paket render untuk Free dan Pro
- [ ] Edge case EC-A5: generate gagal → kuota tidak increment
- [ ] Edge case EC-E3: user tanpa subscription row → default Free
- [ ] Semua test observed failing first (RED) sebelum implementasi (GREEN)

### 6.8 Lint & CI

- [ ] `pnpm lint` lulus (Effect ESLint: no `flow`, no deep imports, no tacit)
- [ ] `pnpm effect:check` lulus
- [ ] `pnpm type-check` lulus lintas paket
- [ ] `pnpm test` lulus (RTK: `rtk vitest`, failures-only)

---

## 7. Open Questions

| # | Question | Context | Suggested default |
|---|----------|----------|-------------------|
| Q1 | Apakah kuota Free (5/bln) cukup atau terlalu ketat untuk konversi? | Guru SD generate intensif saat UTS/UAS; 5/bln mungkin kurang di musim ujian | Mulai 5, ukur konversi 3 bulan, adjust |
| Q2 | Provider pembayaran mana yang dipilih untuk P1? | Midtrans (QRIS+VA mature), Xendit (e-wallet luas), Trippe (lightweight) | Midtrans (QRIS + VA + GoPay dalam satu SDK) |
| Q3 | Apakah Pro limit 50/bln cukup, atau perlu paket sekolah (school plan)? | Guru dengan 6 kelas × 5 mapel × 2 semester = ~60 lembar/thn | 50/bln cukup untuk individual; school plan = fase 3 |
| Q4 | Bagaimana menangani guru yang sudah punya bank soal > 5 saat downgrade? | EC-F1: data tidak dihapus, hanya gate aksi baru | Konfirmasi: soft-gate, tidak hapus data |
| Q5 | Apakah trial 14 hari sebaiknya auto-start saat signup, atau manual opt-in? | Auto-start mungkin buang-buang untuk guru yang cuma lihat | Manual opt-in (US-M4), lebih sedikit tapi lebih berkualitas |
| Q6 | Apakah perlu paket "Pro Guru Sekolah" (multi-teacher billing) di masa depan? | Kepala sekolah mungkin ingin bayar untuk semua guru | Defer ke fase 3 (multi-tenant school billing) — out of scope theme-brief |

---

## Appendix A — Code Seams Reference

Landasan implementasi pada kode eksisting (bukan greenfield):

| Seam | Path | Peran |
|------|------|-------|
| User table | `packages/db/src/schema/users.ts` | Tambah relasi ke `subscriptions` |
| Exams table | `packages/db/src/schema/exams.ts` | `sourceMode` column sudah ada — gate di handler |
| Auth middleware | `apps/api/src/api/middleware/auth.ts` | `CurrentUser` tag → extend atau tambah `CurrentPlan` tag |
| Rate-limit core | `apps/api/src/api/lib/rate-limit-core.ts` | Burst protection in-memory tetap; kuota bulanan persisten di DB |
| Generate input | `packages/shared/src/schemas/api.ts` (`GenerateExamInputSchema`) | `sourceMode` field → gate di handler |
| API definition | `apps/api/src/api/definition.ts` | Tambah `BillingGroup` (aditif) |
| AppLayer | `apps/api/src/layers/AppLayer.ts` | Compose `SubscriptionServiceLive` + `PaymentProviderStubLive` |
| Me handler | `apps/api/src/api/handlers/me.ts` | `loadProfile` → sertakan plan + quota |
| Export service | `apps/api/src/api/handlers/export.ts` | Gate `format=pdf|docx` di plan check |
| Bank service | `apps/api/src/api/services/bank-service.ts` | Gate `bankedCount` di plan check |
| Web generate route | `apps/web/src/routes/_auth.generate.tsx` | Disable source mode selector untuk Free |
| Web API client | `apps/web/src/lib/api/` | Handle `403 PlanQuotaExhausted` / `FeatureNotInPlan` |
| DB seed dev | (script `db:seed:dev`) | Seed `subscription` row `dev_grant` |

## Appendix B — Effect Schema Sketch (illustrative, not final)

```typescript
// packages/shared/src/schemas/primitives.ts
export const PlanSchema = Schema.Literal("free", "pro")
export type Plan = typeof PlanSchema.Type

export const SubscriptionStatusSchema = Schema.Literal(
  "free", "trialing", "active", "canceled", "trial_expired", "past_due", "dev_grant"
)

// packages/shared/src/schemas/entities.ts
export const SubscriptionIdSchema = Schema.String.pipe(Schema.brand("SubscriptionId"))
export type SubscriptionId = typeof SubscriptionIdSchema.Type

export const SubscriptionSchema = Schema.Struct({
  id: SubscriptionIdSchema,
  userId: UserIdSchema,
  plan: PlanSchema,
  status: SubscriptionStatusSchema,
  currentPeriodStart: Schema.NullOr(Schema.String),
  currentPeriodEnd: Schema.NullOr(Schema.String),
  cancelAtPeriodEnd: Schema.Boolean,
  trialEnd: Schema.NullOr(Schema.String),
  hasUsedTrial: Schema.Boolean,
  paymentProvider: Schema.NullOr(Schema.String),
  externalSubscriptionId: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type Subscription = typeof SubscriptionSchema.Type

// apps/api/src/api/errors/http.ts
export class PlanQuotaExhausted extends Schema.TaggedError("PlanQuotaExhausted")({
  error: Schema.String,
  code: Schema.Literal("QUOTA_EXHAUSTED"),
  remaining: Schema.Int,
  limit: Schema.Int,
  resetAt: Schema.String
}) {}

export class FeatureNotInPlan extends Schema.TaggedError("FeatureNotInPlan")({
  error: Schema.String,
  code: Schema.Literal("PLAN_RESTRICTED"),
  feature: Schema.String,
  requiredPlan: PlanSchema
}) {}
// Both annotated with HttpApiSchema.annotations({ status: 403 })
```

## Appendix C — Phased Rollout

| Phase | Product goal | Stories |
| ----- | ------------ | ------- |
| **P0** (MVP Code) | DB schema + service + API gates + Web badge/CTA + stub payment | US-M1, US-M2 (stub), US-M3, US-M5, US-M6, US-M7, US-M8, US-M9, US-M11 |
| **P1** (Pasca-MVP) | Payment provider nyata (QRIS/VA), trial, templates gate, billing riwayat, email notif | US-M4, US-M10, US-M12 |
| **P2** (Future) | School plan (multi-teacher), refund automation, advanced abuse detection | (out of scope theme-brief) |

**Rule:** satu milestone per fase. Jangan ship P0 + P1 + P2 dalam satu rilis.

---

## References

- [Theme brief — Monetize](../theme-brief.md)
- [Context pack — allowlist](../context-pack.md)
- [PRD v2 — Core product](../../../PRD-v2-final.md)
- [PRD v8 — Generate PDF Enhancement](../../../PRD-v8-generate-pdf-enhancement.md)
- [ROADMAP — Milestones M1–M7](../../../ROADMAP.md)
- [RFC 2026-06-25 — Bab materi picker (style ref)](../../../rfc/2026-06-25-bab-materi-picker-rfc.md)
- [AGENTS.md — Stack conventions](../../../../AGENTS.md)
