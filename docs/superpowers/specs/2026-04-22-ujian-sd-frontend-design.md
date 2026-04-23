# Ujian SD — Frontend Implementation Design Spec

**Date:** 2026-04-22
**Status:** Draft
**Scope:** All 7 MVP screens, UI-first with mock data, shadcn components + Ujian SD design tokens

---

## Context

The Ujian SD web app helps Indonesian elementary school teachers (Kelas 5-6) generate, print, and grade exam papers aligned with Kurikulum Merdeka. The design system (tokens, typography, colors) was created in Claude Design and exported as a handoff bundle. The codebase has foundation infrastructure (auth, DB schema, 7 UI components, typed API client) but only 2 placeholder pages.

This spec covers implementing all 7 MVP screens as a UI-first pass with mock data, using shadcn components restyled with the project's warm-paper design tokens.

**Design influences:**
- Design-taste-frontend: DESIGN_VARIANCE 8 (asymmetric layouts), MOTION_INTENSITY 6 (fluid CSS), VISUAL_DENSITY 4 (airy, teacher-friendly)
- Minimalist-ui: Warm monochrome + spot pastels, editorial macro-whitespace, ultra-flat surfaces
- Ujian SD design bundle: Merah Ujian primary, Kertas warm neutrals, Papan Hijau secondary, Plus Jakarta Sans UI / Lora print / JetBrains Mono

---

## 1. Shared Infrastructure

### 1.1 App Shell (`_auth.tsx`)

The auth layout wraps all authenticated pages with:
- **Sticky nav (56px):** Logo mark + "Ujian SD" wordmark left-aligned, teacher avatar (32px circle from Google) + name + logout icon right-aligned
- **Main area:** `bg-bg-app` (#FBF7F1), `max-w-[1120px] mx-auto px-6 py-8`
- Nav uses `bg-bg-surface` with `border-b border-border-default` and `shadow-xs`

### 1.2 New shadcn Components (via MCP, restyled)

Pull from shadcn registry into `packages/ui/src/components/`, then restyle with project tokens:

| Component | Restyle Notes |
|-----------|--------------|
| **Tabs** | `bg-bg-muted` for list, `text-primary-600` active indicator, `rounded-sm` |
| **Textarea** | `border-border-ui`, `bg-bg-surface`, `focus:border-border-focus`, `rounded-xs` |
| **RadioGroup** | Custom styled as toggle cards, `border-primary-600` when selected |
| **Progress** | `bg-kertas-200` track, `bg-primary-600` fill (or `bg-secondary-700` for score) |
| **Table** | No borders on cells — `divide-y divide-border-default` rows only, `hover:bg-kertas-50` |
| **Separator** | `bg-border-default` |
| **Tooltip** | `bg-kertas-900 text-white rounded-sm shadow-md` |

### 1.3 Custom Components (built in `packages/ui`)

| Component | Description |
|-----------|-------------|
| **Skeleton** | Warm shimmer loader (`bg-kertas-200` → `bg-kertas-100` animation) |
| **FileUpload** | Drag-drop zone with dashed border, PDF icon, size validation |
| **AnswerGrid** | 20-row A/B/C/D button grid with instant correct/incorrect feedback |
| **ScoreBar** | Progress bar with label "Benar: X / 20 — Nilai: Y / 100" |
| **EmptyState** | Centered message with optional kop-stamp illustration + CTA button |
| **PageHeader** | Back arrow + title + subtitle + optional actions right-aligned |
| **StatCard** | Compact stat display (number + label) for dashboard |

### 1.4 Mock Data (`apps/web/src/lib/mock-data.ts`)

Realistic Indonesian content:
- 20 Bahasa Indonesia questions with proper CP Fase C alignment
- Exam metadata: "SD Negeri 1 Jakarta", "2025/2026", etc.
- Teacher: "Bu Sari Wulandari" with avatar URL
- Student names for grading: "Budi Santoso", "Ani Wijaya", "Citra Dewi", etc.

### 1.5 Route Structure

```
routes/
  __root.tsx              — root layout (Outlet only)
  index.tsx               — login (unauthenticated)
  _auth.tsx               — auth guard + app shell nav
  _auth.dashboard.tsx     — dashboard
  _auth.generate.tsx      — generate form (US-8)
  _auth.review.tsx        — review fast/slow (US-9/9b)
  _auth.preview.tsx       — print preview + tabs (US-14-18)
  _auth.grading.$examId.tsx — koreksi cepat (US-19/20)
  _auth.history.tsx       — riwayat (US-17)
```

---

## 2. Screen Designs

### 2.1 Login (`index.tsx`)

**Layout:** Split-screen (DESIGN_VARIANCE 8, anti-center).
- **Left 60%:** `bg-bg-app` warm paper. Logo mark top-left (`mb-12`). Display heading "Buat Soal Ujian SD dengan Mudah" left-aligned (`text-display tracking-tighter`). Subtitle: "Sesuai Kurikulum Merdeka — Bahasa Indonesia & Pendidikan Pancasila" (`text-body-lg text-text-secondary`). Google login button below (`mt-8`). Footer: "SD Kelas 5 & 6" label.
- **Right 40%:** `pattern-paper.svg` at 5% opacity overlaid on `bg-kertas-100`. Large wordmark centered vertically. Subtle gradient fade on the edge.
- **Mobile fallback:** Single column, left content only, full-width.

### 2.2 Dashboard (`_auth.dashboard.tsx`)

**Greeting section:** Left-aligned H1 "Selamat datang, Bu Sari!" + stat line "8 lembar tersimpan (5 final)" (`text-body text-text-secondary`).

**Bento grid** (`grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 mt-8`):
- **Large card (Generate):** White surface, `p-6`, sparkles icon in `text-primary-600`, H3 "Generate Lembar Soal", description text, primary CTA button "Generate Lembar"
- **Small card (Riwayat):** White surface, `p-6`, files icon, H3 "Riwayat Ujian", exam count, secondary button "Lihat Semua"

**Last exam section** (`mt-8`): Horizontal card with exam title, subject badge, date, quick actions (Cetak, Koreksi buttons).

**Empty state:** If no exams, show EmptyState with kop-stamp.svg, copy "Belum ada lembar tersimpan. Mulai dengan generate lembar pertama Anda." + primary CTA.

### 2.3 Generate Form (`_auth.generate.tsx`)

**PageHeader:** Arrow-left back to dashboard + "Generate Lembar (AI)" H1 + "1 lembar = 20 soal PG" subtitle.

**Two-column layout** (`grid md:grid-cols-[1fr_340px] gap-8`):

**Left — Form:**
- FileUpload zone: dashed `border-2 border-dashed border-border-ui rounded-md p-8`, upload icon, "Drag & drop PDF (maks 10MB)" text, click to browse. After upload: file name + size + remove button.
- Form fields (stacked, `gap-5`):
  - Kelas: Select (5 / 6)
  - Kurikulum: Select disabled "Kurikulum Merdeka" + lock icon + helper "Fase C (Kelas 5-6)"
  - Mata Pelajaran: Select (Bahasa Indonesia / Pendidikan Pancasila)
  - Topik: Select (dynamic list from §8.3, changes with mapel)
  - Tingkat Kesulitan: Select (Mudah / Sedang / Sulit / Campuran)
  - Mode Review: RadioGroup as two cards side-by-side — "Cepat (default)" and "Detail"
  - Contoh Soal: Textarea (optional), placeholder "Paste contoh soal yang diinginkan gayanya..."
- CTA: "Generate Lembar" primary button full-width with sparkles icon

**Right — Sidebar summary card:**
- Config summary: shows selected values in a compact list
- "Jumlah soal: 20" fixed info badge
- Disabled "Generate Lembar" button mirrors when form is incomplete

**Loading state:** Overlay with skeleton matching form + "Sedang membuat 20 soal... (10-30 detik)"

### 2.4 Review — Fast Track (`_auth.review.tsx`, mode=fast)

**PageHeader:** "Konfirmasi Paket" + Badge "Mode Cepat" + check-circle "20 soal auto-accepted"

**Question list** (compact, `divide-y`):
- Per row: number, truncated question text (1 line), correct answer in mono badge, topic chip, difficulty chip, "Edit" icon button
- Scrollable container with `max-h-[480px] overflow-y-auto`

**Metadata form** (`mt-6`, same fields as Slow Track):
- Sekolah (Input), Tahun Pelajaran (Input), Jenis Ujian (Select, default TKA), Tanggal (Input type date), Durasi (Input, "60 menit"), Petunjuk (Textarea, pre-filled defaults)

**Actions:** "Regenerate paket" secondary, "Switch ke Review Detail" ghost link, "Preview Lembar" primary (enabled when metadata complete)

### 2.5 Review — Slow Track (`_auth.review.tsx`, mode=slow)

**PageHeader:** "Review (20 soal)" + counter badge "17 dari 20 siap" + bulk actions: "Terima Semua", "Ganti ditolak"

**Question cards** (stacked, `gap-4`):
- Card per question: number + difficulty badge + topic chip in header
- Body: question text, 4 options (a-d) displayed, correct answer highlighted with `bg-success-bg` badge
- Footer: three action buttons — Terima (check-circle, success), Edit (pencil, secondary), Tolak (x-circle, danger)
- Accepted: subtle `border-l-2 border-success-solid` left indicator + muted card
- Rejected: `border-l-2 border-danger-solid` + "Perlu diganti" label

**Metadata form** (same as Fast Track, below cards)

**CTA:** "Preview Lembar" disabled until counter = "20 dari 20 siap"

### 2.6 Preview & Print (`_auth.preview.tsx`)

**Sticky toolbar** (below nav): Tabs component (Soal | Lembar Jawaban | Kunci Jawaban | Semua). Print buttons right-aligned: "Cetak Semua", "Cetak Soal Saja", "Cetak Lembar Jawaban", "Cetak Kunci"

**A4 Canvas:** Centered white card (`max-w-[816px]` = ~A4 width at 96dpi), `shadow-md`, paper-like padding (2cm simulated)

**Tab: Soal** — KOP header (school name uppercase bold), exam title, student info grid, petunjuk box, 2-column question layout (1-10 left, 11-20 right), serif font for content

**Tab: Lembar Jawaban** — Simplified KOP, student info fields, 2-column answer grid (bubbles: ○ A  ○ B  ○ C  ○ D), signature area, score area

**Tab: Kunci Jawaban** — Header, 4×5 grid of answers in mono font, scoring info "Setiap jawaban benar = 5 poin. Total: 100"

**Print CSS** (in app.css `@media print`): Hide nav/toolbar, serif font, A4 margins 2cm, page breaks between sections

### 2.7 Koreksi Cepat (`_auth.grading.$examId.tsx`)

**Two-panel layout** (`grid md:grid-cols-[1fr_360px] gap-6`):

**Left — Grading form:**
- Student name input + student number badge (auto-increment)
- ScoreBar: Progress component + "Benar: 14 / 20 — Nilai: 70 / 100" real-time
- AnswerGrid: 20 rows, each with:
  - Row number (mono)
  - 4 answer buttons (A/B/C/D) — styled as toggle group
  - Result indicator: check-circle green (correct) or x-circle red + "(jawaban benar: B)" text
- Keyboard hint: "Tekan A/B/C/D lalu Enter" in `<kbd>` styled tags
- Actions: "Reset" secondary, "Murid Berikutnya" primary with arrow-right icon, "Cetak Hasil Murid" ghost

**Right — Rekap sidebar:**
- Table: No., Nama Murid, Nilai — rows accumulate per student
- Active student row highlighted with `bg-accent-50`
- Stats below: Rata-rata, Nilai Tertinggi, Nilai Terendah
- "Cetak Rekap Kelas" button
- Warning alert: "Data rekap akan hilang jika halaman ditutup. Cetak terlebih dahulu jika perlu." using `warning-bg` + alert-triangle icon

**All data in React state only** — no API calls, no persistence (per PRD US-19/20)

### 2.8 Riwayat (`_auth.history.tsx`)

**PageHeader:** "Riwayat Ujian"

**Filters:** Horizontal row — Status select (Semua / Draft / Final), Mata Pelajaran select (Semua / BI / PPKN)

**Table** (`divide-y`, no cell borders per minimalist-ui):
- Columns: Nama Ujian, Mata Pelajaran (subject badge), Kelas, Tanggal, Status (badge: DRAFT yellow, FINAL green), Aksi
- Actions: icon buttons with tooltips — Cetak (printer), Koreksi (check-circle), Edit (pencil), Duplikat (copy), Hapus (trash-2 with confirm dialog)
- Row hover: `bg-kertas-50` transition

**Empty state:** "Belum ada ujian tersimpan." + CTA to Generate

---

## 3. Motion & Interaction Spec

Per MOTION_INTENSITY 6 (fluid CSS, no framer-motion needed):

| Interaction | Spec |
|-------------|------|
| Page enter | Content fades in `translateY(4px)` → 0, opacity 0→1, 240ms ease-std |
| Button hover | `bg-primary-700`, `translateY(-1px)`, shadow xs→md, 120ms |
| Button press | `scale(0.98)`, 80ms |
| Card hover (clickable) | Border `kertas-200` → `primary-300`, shadow xs→md |
| Row hover | `bg-transparent` → `bg-kertas-50` |
| Modal enter | Opacity + `translateY(4px)`, 240ms |
| Staggered grid | `animation-delay: calc(var(--index) * 80ms)` |
| Loading skeleton | Warm shimmer `bg-kertas-200` → `bg-kertas-100`, infinite |
| Focus ring | 3px outline `primary-600/40`, 2px offset |
| Disabled | `opacity-45 cursor-not-allowed` |
| `prefers-reduced-motion` | All durations → 0ms |

---

## 4. Verification Plan

1. **Dev server:** `pnpm dev` — visit each route in browser
2. **Visual check per screen:** Compare against PRD wireframes (§4.1-4.7)
3. **Print test:** Use Chrome print dialog on Preview page — verify A4 layout, serif font, 2-column questions, page breaks
4. **Keyboard nav:** Test Koreksi with A/B/C/D + Enter keyboard flow
5. **Empty states:** Verify all screens show appropriate empty state when no data
6. **Loading states:** Verify skeleton appears during simulated delays
7. **Responsive:** Check 1280px+ desktop and 768px tablet graceful degradation
8. **Accessibility:** Tab navigation, focus rings visible, WCAG AA contrast (verified in design tokens)
9. **Type check:** `pnpm type-check` passes

---

## 5. Files to Modify/Create

### Modify
- `apps/web/src/app.css` — add motion keyframes, print styles
- `apps/web/src/routes/__root.tsx` — keep minimal
- `apps/web/src/routes/_auth.tsx` — add app shell (nav bar)
- `apps/web/src/routes/_auth.dashboard.tsx` — full dashboard implementation
- `apps/web/src/routes/index.tsx` — redesign login as split-screen

### Create (routes)
- `apps/web/src/routes/_auth.generate.tsx`
- `apps/web/src/routes/_auth.review.tsx`
- `apps/web/src/routes/_auth.preview.tsx`
- `apps/web/src/routes/_auth.grading.$examId.tsx`
- `apps/web/src/routes/_auth.history.tsx`

### Create (components in packages/ui)
- Shadcn pulls: `tabs.tsx`, `textarea.tsx`, `radio-group.tsx`, `progress.tsx`, `table.tsx`, `separator.tsx`, `tooltip.tsx`
- Custom: `skeleton.tsx`, `file-upload.tsx`, `page-header.tsx`, `empty-state.tsx`

### Create (web app lib)
- `apps/web/src/lib/mock-data.ts`
- `apps/web/src/components/app-shell.tsx` (nav bar component)
- `apps/web/src/components/answer-grid.tsx` (grading-specific)
- `apps/web/src/components/score-bar.tsx`
- `apps/web/src/components/print-layout.tsx` (A4 canvas components)

---

## 6. Component Reuse Map

| Existing Component | Used In |
|-------------------|---------|
| Button | Every screen — primary/secondary/ghost/danger variants |
| Badge | Review (topic/difficulty), Riwayat (status), Dashboard (count) |
| Card | Dashboard cards, Generate sidebar, Review question cards |
| Dialog | Delete confirmation (Riwayat), discard changes |
| Input | Generate form, Review metadata, Koreksi student name |
| Label | All forms |
| Select | Generate (kelas, mapel, topik, kesulitan), Riwayat filters |
