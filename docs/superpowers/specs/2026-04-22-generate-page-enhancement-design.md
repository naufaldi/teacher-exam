# Generate Page Enhancement Design

**Date:** 2026-04-22
**Status:** Draft
**PRD Reference:** US-7 (Upload Materi), US-8 (Konfigurasi AI)
**Target File:** `apps/web/src/routes/_auth.generate.tsx`

---

## Context

The Generate page (`/generate`) exists with a working form + sidebar layout but lacks the visual polish of the dashboard. The dashboard sets a high bar with radial gradient washes, staggered animations, badge chips, and warm paper aesthetics. This spec enhances the Generate page to match that quality while filling PRD gaps (complete topic lists, jumlah soal info label, error handling, custom topic input).

**Scope:** Single-file enhancement of `_auth.generate.tsx`. No new UI components, no new dependencies, no CSS changes.

---

## Changes

### 1. Complete Topic Lists (PRD Section 8.3)

Replace the partial topic arrays with the full lists from the PRD.

**TOPIK_BI** (20 items):
- Pemahaman Bacaan
- Ide Pokok dan Gagasan Pendukung
- Unsur Intrinsik Cerita (Tokoh, Latar, Alur, Amanat)
- Teks Narasi
- Teks Eksplanasi
- Teks Deskripsi
- Teks Eksposisi
- Teks Persuasi
- Kosakata (Denotatif, Konotatif, Kiasan)
- Gaya Bahasa (Majas)
- Kalimat Langsung dan Tidak Langsung
- Kalimat Majemuk
- Tanda Baca dan Ejaan
- Puisi
- Cerpen dan Fabel
- Dongeng dan Legenda
- Surat Resmi dan Surat Pribadi
- Iklan
- Opini dan Fakta
- Ringkasan dan Kesimpulan

**TOPIK_PPKN** (14 items):
- Hubungan Antar-Sila dalam Pancasila
- Nilai-Nilai Pancasila sebagai Pandangan Hidup
- Penerapan Nilai Pancasila di Kehidupan Sehari-hari
- Pengamalan Pancasila di Lingkungan Keluarga, Sekolah, Masyarakat
- Norma dalam Kehidupan Bermasyarakat
- Hak dan Kewajiban Warga Negara
- Hak dan Kewajiban Anak
- Keberagaman Budaya Indonesia
- Keberagaman Agama dan Toleransi
- Menghormati Perbedaan
- Provinsi di Indonesia dan Wilayah NKRI
- Persatuan dan Kesatuan Bangsa
- Gotong Royong
- Musyawarah dan Pengambilan Keputusan

**Custom topic support** (PRD: "opsi teks bebas untuk topik custom"):
- Add a final SelectItem: value `__custom`, label "Lainnya (ketik sendiri)..."
- New state: `customTopik: string`
- When `topik === '__custom'`, render an Input below the Select with placeholder "Ketik topik Anda..."
- Effective topic for submission: `topik === '__custom' ? customTopik : topik`

### 2. Hero Section (replaces PageHeader)

Replace the bare `<PageHeader>` with a dashboard-style hero card matching the greeting section pattern.

**Structure:**
- Container: `rounded-lg border border-border-default bg-white p-7 relative overflow-hidden`
- Subtle red radial gradient wash (pointer-events-none absolute overlay): `radial-gradient(ellipse 1200px 360px at -10% -40%, rgba(180,35,24,0.07), transparent 60%)`
- Back button: inline text button with ArrowLeft icon
- Icon box: `w-11 h-11 rounded-[12px] bg-primary-600 text-white` with Sparkles icon
- Title: `text-h1 font-bold` "Generate Lembar (AI)"
- Subtitle: `text-body text-text-tertiary` "1 lembar = 20 soal pilihan ganda"
- Reactive badge row: Kurikulum Merdeka pill badge + subject-colored badge (updates when mapel changes)
- Wrap in `animate-fade-up-stagger` with `--index: 0`

### 3. Form Grouping with Section Headers

Group the flat field list into three logical sections. Each section gets:
- A header: `text-caption font-semibold tracking-wider uppercase text-text-tertiary` + `Separator`
- `animate-fade-up-stagger` with incrementing `--index`

| Section | Header | Fields | --index |
|---------|--------|--------|---------|
| A | Materi Ujian | FileUpload, Kelas, Kurikulum (locked), Mapel, Topik (+custom) | 1 |
| B | Pengaturan Soal | Kesulitan, Jumlah Soal (info), Mode Review | 2 |
| C | Referensi (Opsional) | Contoh Soal textarea | 3 |

### 4. Jumlah Soal Info Label (new)

PRD requirement: "Jumlah soal: 20 (fixed, label info -- bukan input)"

Placed in Section B between Kesulitan and Mode Review:
- Read-only row: `flex items-center justify-between p-3 rounded-sm bg-bg-muted border border-border-default`
- Left: Label "Jumlah Soal"
- Right: `<Badge variant="secondary">20 soal</Badge>`

### 5. Enhanced Loading State

Replace basic skeleton overlay with progress-driven UX.

**New state:** `progress: number` (0-100), `progressStep: number` (0-3)

**Step labels** (module-level constant):
```
0: "Menganalisis materi dan topik..."
1: "Membuat 20 soal pilihan ganda..."
2: "Menyusun kunci jawaban..."
3: "Melakukan validasi akhir..."
```

**Behavior:**
- On generate start: interval (300ms) increments progress by random 2-5, capped at 90
- Step transitions at thresholds: 0-20% = step 0, 20-50% = step 1, 50-75% = step 2, 75-90% = step 3
- On API resolve: jump to 100%, brief pause, then navigate
- Cleanup interval on unmount/completion

**Overlay design:**
- `bg-bg-app/90 backdrop-blur-[2px]` frosted overlay
- Centered content: Sparkles icon in primary-50 circle with `animate-pulse`, Progress bar, step label, estimation text

### 6. Error Handling

**New state:** `error: string | null`

**Behavior:**
- Clear error on new generate attempt
- Catch API failures, set error message: "Gagal membuat soal. Silakan coba lagi."

**Display:** Inline alert above CTA button:
- `bg-danger-bg border border-danger-border rounded-sm p-3`
- AlertTriangle icon + error text + dismiss X button

### 7. Enhanced Sidebar

Upgrade the sticky summary Card:

**A. Completion indicator** at top:
- Count filled required fields (kelas, mapel, topik, kesulitan) = 0-4
- `<Progress value={filledCount * 25} className="h-1.5" />` + `{filledCount}/4` caption

**B. Section header:**
- `text-caption font-semibold tracking-wider uppercase text-text-tertiary` "Ringkasan Konfigurasi"

**C. Subject badge:** Replace plain mapel text with `<Badge variant="subject-bi">` or `subject-ppkn`

**D. File indicator:** When PDF uploaded, show FileText icon + truncated filename

**E. Stagger animation:** `animate-fade-up-stagger` with `--index: 4`

### 8. Decorative Polish

- **Radio card hover lift:** Add `hover:-translate-y-0.5 hover:shadow-md transition-all duration-[180ms]` to Mode Review radio labels
- **CTA area:** Separate with `pt-4 border-t border-border-default mt-6`, use `size="lg"` on Button, add helper text below: "AI akan membuat 20 soal sesuai Capaian Pembelajaran Fase C"
- **Stagger timing:** All sections use `animate-fade-up-stagger` with sequential `--index` values

---

## New Imports

From `lucide-react` (add to existing import): `ArrowLeft`, `AlertTriangle`, `FileText`, `X`
From `@teacher-exam/ui` (add to existing import): `Progress`

## New State Hooks

| Hook | Type | Purpose |
|------|------|---------|
| `customTopik` | `string` | Free-text custom topic input |
| `progress` | `number` | Loading progress bar value (0-100) |
| `progressStep` | `number` | Current step label index (0-3) |
| `error` | `string \| null` | API error message |

## What Is NOT Changed

- No modifications to any `packages/ui` component
- No new CSS keyframes (`animate-fade-up-stagger` already exists in `app.css`)
- No new libraries or dependencies
- No changes to routing or layout wrapper (`_auth.tsx`)
- Submit handler remains a stub (API integration is separate work)
- No changes to `app.css` or `tailwind.css`

---

## Verification

1. Run `cd apps/web && pnpm vite --port 5173` and navigate to `/generate`
2. Verify hero section renders with gradient wash and reactive badges
3. Verify all 20 BI topics and 14 PPKN topics appear in dropdown
4. Verify "Lainnya" option reveals custom text input
5. Verify "Jumlah Soal: 20 soal" info label is visible
6. Verify form sections have headers and staggered animation
7. Verify sidebar shows completion progress (0/4 to 4/4)
8. Click "Generate Lembar" -- verify progress bar + step labels animate
9. Verify error state renders inline alert (test by modifying stub to throw)
10. Type-check: `pnpm type-check` passes
