# Product Requirements Document (PRD) v7

## Bab-Based Materi Picker on Generate

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| **Product Name** | School Exam Generator (Ujian SD)           |
| **Version**      | 7.0 — Bab Materi Picker                    |
| **Date**         | 2026-06-25                                 |
| **Status**       | Shipped                                    |
| **Baseline**     | PRD v3 (multi-mapel), RFC all-mapel K1–6   |
| **RFC**          | [2026-06-25-bab-materi-picker-rfc.md](rfc/2026-06-25-bab-materi-picker-rfc.md) |

---

## 1. Problem

On the Generate page, teachers could not choose **specific book materi (Bab)** when configuring an exam.

| Symptom | Who is affected |
| ------- | --------------- |
| Kelas 1–4 showed only **"Materi sesuai Buku Siswa"** (one blanket option, often auto-selected) | Guru Kelas 1–4 |
| Kelas 5–6 used **hardcoded competency lists** that did not match Bab titles in Buku Siswa | All guru using K5–6 |
| Ulangan Harian and UTS could not be scoped to **one Bab** vs **many Bab** | Guru preparing formative vs summative sheets |

**Business impact:** teachers could not align generated sheets with weekly materi (1 Bab) or midterm scope (several Bab). The product felt disconnected from how Buku Siswa is organized (1 book ≈ 1 tahun ajaran, multiple Bab).

---

## 2. Solution

Replace client-side topic lists with **Bab titles parsed from the committed Buku Siswa markdown corpus**.

| Capability | Behavior |
| ---------- | -------- |
| Materi source | `GET /api/curriculum/bab-topics?subject=&grade=` |
| Display label | `Bab {n}: {judul}` — same as `## Bab n:` headers in corpus |
| Selection | Multi-select **1–8 Bab** per exam |
| Custom scope | **Lainnya (ketik sendiri)** retained |
| AI scope | Bab-prefixed topics → strict filter to selected Bab only |

---

## 3. User Stories

### US-1 — Ulangan Harian per Bab

**As a** guru SD,
**I want to** pick **one Bab** from Buku Siswa when creating Ulangan Harian,
**So that** the generated sheet matches the materi I just taught this week.

**Acceptance criteria**

- [x] After choosing kelas + mapel, Materi dropdown lists all Bab from that book
- [x] Each option shows `Bab N: {judul}` (not generic competency names)
- [x] Teacher can select exactly 1 Bab and generate
- [x] AI prompt restricts questions to that Bab’s content

### US-2 — UTS / UAS across multiple Bab

**As a** guru SD,
**I want to** select **multiple Bab** for one exam,
**So that** I can build a midterm covering Bab 1–3 (or more) in one sheet.

**Acceptance criteria**

- [x] Multi-select up to **8 Bab**
- [x] Summary sidebar shows selected materi
- [x] AI distributes questions across selected Bab evenly
- [x] Each question’s `topic` field reflects the Bab source

### US-3 — All grades use book structure

**As a** guru any kelas (1–6),
**I want** the same Bab-based picker for every ready mapel,
**So that** I am not stuck with fallback or outdated hardcoded lists.

**Acceptance criteria**

- [x] Kelas 1–4 no longer show only "Materi sesuai Buku Siswa"
- [x] Kelas 5–6 use Bab from corpus (replaces `generate-topics.ts`)
- [x] Empty list + message when corpus has no Bab blocks

### US-4 — Custom materi (edge case)

**As a** guru,
**I want to** type a custom materi scope when Bab list is not enough,
**So that** I can still generate for special classroom needs.

**Acceptance criteria**

- [x] "Lainnya (ketik sendiri)" remains available
- [x] Custom text keeps broader directive prompt behavior (not Bab filter)

---

## 4. Out of Scope (v7)

- "Pilih semua Bab" shortcut button
- Exam-type auto-suggestions (e.g. UTS pre-selects half the book)
- Runtime PDF Bab parsing (corpus `.md` remains source of truth)
- Injecting only selected Bab markdown into prompt (full corpus still sent; prompt filters scope)

---

## 5. Success Metrics

| Metric | Target |
| ------ | ------ |
| Bab label accuracy vs corpus headers | 100% match on ready books |
| Fallback topic usage on ready grades | 0% (no "Materi sesuai Buku Siswa" in picker) |
| Generate blocked without materi | Yes — teacher must pick ≥1 |

---

## 6. References

- PRD v3 §2.2 — topik mengacu bab buku siswa
- RFC foundation — Phase 2 per-Bab filtering ([2026-04-22-ujian-sd-foundation-rfc.md](superpowers/specs/2026-04-22-ujian-sd-foundation-rfc.md))
- Corpus schema — `## Bab n: {Judul}` ([2026-06-10-pdf-handling-rfc.md](rfc/2026-06-10-pdf-handling-rfc.md))
