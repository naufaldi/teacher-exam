# Product Requirements Document (PRD) - Monetization v1

## Free / Pro Feature Gates for School Exam Generator (Ujian SD)

| Field | Value |
| ----- | ----- |
| **Product Name** | School Exam Generator (Ujian SD) |
| **Version** | Monetization v1 - Free / Pro MVP |
| **Date** | 2026-07-09 |
| **Status** | Draft |
| **Baseline** | PRD v2, PRD v8 Generate PDF Enhancement, ROADMAP 2026-2027 |
| **Primary Payer** | Guru SD individual; school reimbursement / seat packs later |

---

## 1. Executive Summary

### 1.1 Problem / Pain

Ujian SD already has a strong teacher workflow: login -> generate lembar -> review -> preview/cetak/export -> koreksi/analytics. Usage is now cost-bearing in several places:

- **AI generation has variable cost** - every full sheet, regenerate, pembahasan, and curriculum validation consumes provider tokens.
- **PDF guru workflows add storage and retrieval cost** - uploaded PDF, RAG chunks, extracted images, and async jobs are higher-cost than the default Buku Siswa path.
- **High-value outputs are still free** - downloadable PDF/DOCX, templates, and deeper analytics create clear productivity value but currently have no monetization boundary.
- **No useful trial shape exists** - either everything remains free and unbounded, or a blunt paywall would prevent teachers from experiencing the core value.

Indonesian SD teachers are price-sensitive and often pay personally before a school reimburses tools. The Free plan must still let a teacher make a real printable exam, while Pro must unlock practical, non-artificial value: more AI volume, custom material, reusable PDF library, downloadable exports, templates, and deeper correction insights.

### 1.2 Solution

Introduce a two-tier plan model scoped to the existing authenticated guru account (`user.id`):

| Tier | Intent |
| ---- | ------ |
| **Free** | Try and use the core "buat lembar ujian" loop with limited monthly AI usage. |
| **Pro Guru** | Paid individual teacher plan for regular classroom use across the school year. |

The MVP adds an **entitlement + usage quota layer** over existing features. It does not replace better-auth, the Effect HttpApi server, the generate flow, or the current Drizzle/Postgres data model. Gates should be additive at API boundaries and mirrored in the web UI.

**MVP pricing decision:** Pro Guru starts at **Rp49.000 / guru / bulan** with an annual school-year option **Rp399.000 / guru / tahun**. The first code MVP may use a stub/manual billing provider boundary; production payment hardening can follow after gates and usage accounting are correct.

### 1.3 Product Principle

Do not hold teacher work hostage. Plan limits block **new Pro-gated actions**, not access to previously created sheets. A teacher who downgrades or fails payment can still open, review, browser-print, and delete their own historical exams.

---

## 2. Goals and Non-goals

### 2.1 Goals

| Goal | Description |
| ---- | ----------- |
| G1 - Useful Free plan | Free users can create, review, and browser-print real exams from Buku Siswa. |
| G2 - Clear Pro value | Pro unlocks higher AI limits, custom PDF material, reusable PDF library, export files, templates, and deeper analytics. |
| G3 - Additive architecture | Implement gates through shared schemas, Drizzle tables, Effect services/layers, and existing handlers. |
| G4 - Quota correctness | Quota is reserved before expensive AI work, committed on success, and released on system failure. |
| G5 - Indonesian UX | UI copy clearly explains limits in Indonesian and avoids billing jargon where possible. |
| G6 - Safe downgrade | Existing generated exams, public links, and stored files remain understandable after plan changes. |

### 2.2 Non-goals

| Non-goal | Reason |
| -------- | ------ |
| Multi-tenant school / district billing | Out of scope for the first monetization release. |
| Student-facing payments | Product payer is the teacher, not students or parents. |
| Marketplace of soal packs | This PRD monetizes existing product loops, not a content marketplace. |
| Replacing better-auth / Google OAuth | Plan state attaches to the existing authenticated user. |
| Rewriting generate/review/export | Gates wrap existing flows; they do not change the core loop. |
| Changing curriculum corpus licensing | Kurikulum Merdeka corpus access is not the paywall. |
| Full production billing hardening in Code MVP | Provider can be stubbed at boundaries until entitlement and quota behavior are proven. |
| Blocking historical access | Downgrade/payment failure must not hide previously created sheets. |

---

## 3. Free vs Pro Matrix

### 3.1 Plan Matrix

| Capability | Free | Pro Guru |
| ---------- | ---- | -------- |
| Price | Rp0 | Rp49.000/bulan or Rp399.000/tahun |
| Full AI sheet generates | **3 lembar / month** | **100 lembar / month** fair use |
| Max questions per sheet | 20 soal | 50 soal |
| Source mode: Buku Siswa (`default`) | Included | Included |
| Source mode: PDF saya saja (`pdf_guru`) | Locked | Included |
| Source mode: Buku Siswa + PDF (`combine`) | Locked | Included |
| PDF upload / library | View/delete existing only; no new upload/use | Upload, ingest, reuse library |
| PDF images in questions | Locked | Included, existing ~30% question cap |
| Review modes | Cepat + Detail | Cepat + Detail |
| AI assist actions | 10 / month | 300 / month fair use |
| AI assist examples | Regenerate question, pembahasan, curriculum validation | Same, higher limit |
| Browser print | Included | Included |
| Download export PDF/DOCX | Locked | Included for soal, kunci, pembahasan variants |
| Public share link | View/browser-print link included | View/browser-print + downloadable public exports |
| Bank Soal | Own generated sheets visible and reusable | Own sheets + public bank reuse without monthly cap |
| Templates | Default templates only | Create and reuse custom templates |
| Basic correction | Included for final exams | Included |
| Persistent analytics / CSV export | Locked | Included where available |
| Support copy | Community / self-serve | Priority email/WhatsApp response target |

### 3.2 User-facing Limit Definitions

| Term | Product Meaning | Implementation Note |
| ---- | --------------- | ------------------- |
| **Lembar generate** | One successful full exam generation request. | Count once per accepted generate job, sync or async. |
| **AI assist action** | AI work after the first sheet generation. | Includes question regenerate, pembahasan generation, and curriculum validation. |
| **Monthly period** | Calendar month in `Asia/Jakarta`. | Display reset date as `Reset: 1 Agustus 2026`. |
| **Fair use** | Pro still respects abuse/rate limits. | Existing rate-limit middleware remains active. |

### 3.3 Locked-state Copy

Use direct Indonesian copy at the point of action:

| Surface | Copy |
| ------- | ---- |
| Generate quota exhausted | `Kuota gratis bulan ini habis. Upgrade ke Pro untuk membuat lebih banyak lembar.` |
| PDF mode locked | `PDF saya tersedia di Pro: upload LKPD/modul sendiri dan pakai ulang dari perpustakaan.` |
| Export locked | `Export PDF/DOCX tersedia di Pro. Anda tetap bisa cetak dari browser.` |
| Question limit locked | `Free mendukung sampai 20 soal. Pro mendukung sampai 50 soal per lembar.` |
| Analytics locked | `Analisis kelas dan export CSV tersedia di Pro.` |

---

## 4. User Stories

Each story is testable and should be verified against both API behavior and web UI where applicable.

### US-MON-1 - Guru sees current plan and quota

**As a** logged-in guru,  
**I want to** see my plan and remaining quota,  
**So that** I know whether I can generate another exam before starting work.

**Acceptance criteria**

- [ ] Dashboard shows plan badge: `Free` or `Pro Guru`.
- [ ] `/generate` shows remaining full-sheet quota and reset date.
- [ ] Quota copy uses Indonesian labels: `Sisa 2 dari 3 lembar bulan ini`.
- [ ] Pro users see high-level fair-use copy, not a scary billing warning.
- [ ] Data comes from an authenticated entitlement endpoint, not client-side constants.

### US-MON-2 - Free user generates from Buku Siswa within quota

**As a** Free guru,  
**I want to** generate a standard exam from Buku Siswa,  
**So that** I can evaluate whether Ujian SD works for my class.

**Acceptance criteria**

- [ ] Free user can submit `sourceMode=default` while monthly sheet quota remains.
- [ ] Free user can choose any grade/subject that is already ready in the curriculum catalog.
- [ ] `totalSoal` is capped at 20 in UI and API.
- [ ] Generate, review, finalize, public share, and browser print continue to work.
- [ ] Successful generation decrements Free monthly sheet quota exactly once.

### US-MON-3 - Free quota exhaustion blocks expensive AI before provider call

**As a** Free guru with no remaining quota,  
**I want to** get a clear message before waiting,  
**So that** I do not lose time on a request that cannot run.

**Acceptance criteria**

- [ ] Generate button is disabled when quota is known to be exhausted.
- [ ] If a user bypasses UI, `POST /api/ai/generate` returns a typed plan/limit error before invoking `AiClient`.
- [ ] Error response includes machine-readable code `PLAN_LIMIT_EXCEEDED`.
- [ ] UI shows upgrade CTA and reset date.
- [ ] Failed or blocked attempts do not decrement quota.

### US-MON-4 - Pro upgrade unlocks higher limits immediately

**As a** teacher who upgrades to Pro,  
**I want to** use Pro features immediately,  
**So that** I can continue preparing exams during a busy week.

**Acceptance criteria**

- [ ] After subscription status becomes active, entitlement endpoint returns `plan=pro` without requiring logout.
- [ ] `/generate` unlocks 50 questions, `pdf_guru`, `combine`, PDF image toggle, and PDF library usage.
- [ ] Export buttons for PDF/DOCX become active on final exams.
- [ ] Pro limits apply for the current billing period immediately.
- [ ] Existing rate limits still protect abuse even for Pro.

### US-MON-5 - PDF workflows are Pro-gated consistently

**As a** Free guru,  
**I want to** understand why custom PDF modes are locked,  
**So that** I know what Pro adds beyond more quota.

**Acceptance criteria**

- [ ] Source mode selector displays `PDF saya saja` and `Buku Siswa + PDF saya` as locked for Free.
- [ ] Locked PDF options include short explanatory copy and upgrade CTA.
- [ ] `POST /api/pdf-uploads` rejects Free uploads with `FEATURE_GATED`.
- [ ] Free users can list/delete previously uploaded PDFs from an old Pro period, but cannot select them for new generation.
- [ ] Pro users can upload/select ready PDFs as defined by PRD v8 behavior.

### US-MON-6 - Export downloads are Pro, browser print stays Free

**As a** Free guru,  
**I want to** still print exams from the browser,  
**So that** Free remains useful in school.

**Acceptance criteria**

- [ ] Browser print buttons remain available to Free and Pro users.
- [ ] Download PDF/DOCX endpoints require Pro for authenticated exports.
- [ ] Public shared pages remain printable without login.
- [ ] Public PDF/DOCX downloads follow the owner's current export entitlement, so public links do not bypass the Pro gate.
- [ ] UI copy says `Export PDF/DOCX tersedia di Pro. Cetak dari browser tetap gratis.`
- [ ] API and UI gates match; no hidden Pro export path remains.

### US-MON-7 - Downgrade does not hide previous work

**As a** guru whose Pro expires or downgrades,  
**I want to** keep access to exams I already made,  
**So that** I do not lose classroom material.

**Acceptance criteria**

- [ ] User can open, review, duplicate, delete, share, and browser-print existing owned exams after downgrade.
- [ ] Existing public share links keep resolving.
- [ ] Existing exported files are not regenerated for Free; new authenticated PDF/DOCX export is locked.
- [ ] Existing PDF library metadata is visible for cleanup, but PDF selection for generate is locked.
- [ ] Analytics pages show a locked Pro state instead of deleting historical results.

### US-MON-8 - Failed payment enters grace then Free fallback

**As a** Pro guru with a failed renewal,  
**I want to** understand what still works and how to fix payment,  
**So that** I can avoid disruption during exam week.

**Acceptance criteria**

- [ ] Subscription status supports `active`, `grace`, `past_due`, `canceled`, and `free`.
- [ ] Grace period lasts 3 days after paid-through date.
- [ ] During grace, Pro features remain active and UI shows payment warning.
- [ ] After grace, new Pro-gated actions are blocked; historical access remains.
- [ ] If payment recovers, Pro features unlock without losing data.

### US-MON-9 - Billing provider can be stubbed in Code MVP

**As a** developer/operator,  
**I want to** test Free/Pro gates without live payments,  
**So that** monetization can be verified safely before production billing.

**Acceptance criteria**

- [ ] Billing boundary is modeled as an Effect service/layer, not hardcoded inside handlers.
- [ ] Local dev can assign Free/Pro via seed data or env-backed test override.
- [ ] `DEV_AUTH_ENABLED` users can exercise both plans in tests/browser verification.
- [ ] No live provider secret is required for unit/integration tests.
- [ ] Stub mode cannot be enabled silently in production.

### US-MON-10 - Abuse controls remain separate from paid plan

**As an** operator,  
**I want** paid status not to bypass safety limits,  
**So that** one compromised account cannot drain AI budget.

**Acceptance criteria**

- [ ] Existing global and AI rate-limit middleware remains active for Free and Pro.
- [ ] Quota and rate-limit errors have different codes/copy.
- [ ] Duplicate submits use an idempotency key or reservation source ID.
- [ ] Suspicious high-volume usage can be blocked independently of subscription status.
- [ ] Abuse blocks do not present as payment failures.

---

## 5. Edge Cases

Format: **ID -> Condition -> Expected UI -> Expected system**.

### A. Quota Exhaustion and Counting

| ID | Condition | Expected UI | Expected system |
| -- | --------- | ----------- | --------------- |
| EC-A1 | Free user has 0 sheet quota | Disable generate + show reset date and Pro CTA | Reject before AI call with `PLAN_LIMIT_EXCEEDED` |
| EC-A2 | Free user submits 50 questions via API | Show 20 max in UI | Reject with `FEATURE_GATED` or validation details |
| EC-A3 | AI provider fails after quota reservation | Show existing generate error | Release reservation; quota restored |
| EC-A4 | Async job starts then browser tab closes | Show job when user returns | Commit quota once job creates exam; no duplicate on polling |
| EC-A5 | Double-click generate / two tabs submit same payload | Button disabled; second tab gets clear state | Idempotency source prevents double reservation when possible |
| EC-A6 | Month changes during in-flight job | No confusing live counter jump mid-dialog | Count by reservation period key created at start |
| EC-A7 | Curriculum validation quota exhausted | Button locked with Pro/next-reset copy | No AI validator call |
| EC-A8 | Per-question regenerate quota exhausted | Card shows locked action | Existing accepted question remains unchanged |

### B. Plan Changes

| ID | Condition | Expected UI | Expected system |
| -- | --------- | ----------- | --------------- |
| EC-B1 | Free -> Pro upgrade | Locked controls unlock after refresh/poll | Entitlement endpoint returns Pro immediately |
| EC-B2 | Pro -> Free downgrade scheduled | Banner: Pro active until date | Keep Pro until `paidThrough` / period end |
| EC-B3 | Pro expires while user is on `/generate` | Next action shows updated gate | Server remains source of truth; client refreshes entitlement on 403/402 |
| EC-B4 | Downgraded user opens old PDF-generated exam | Exam opens normally | Historical exam read is not plan-gated |
| EC-B5 | Downgraded user duplicates old Pro exam | Explain duplicate may require Pro if using PDF source or >20 soal | Either create Free-compatible copy or block with clear reason |
| EC-B6 | Existing public link after downgrade | Link remains viewable and browser-printable | Public PDF/DOCX export checks owner export entitlement |

### C. Payment Failure

| ID | Condition | Expected UI | Expected system |
| -- | --------- | ----------- | --------------- |
| EC-C1 | Renewal payment fails | Warning banner, Pro still active in grace | Subscription `grace`; gates allow Pro |
| EC-C2 | Grace period ends unpaid | Pro controls locked | Subscription `past_due`; entitlement falls back to Free for new actions |
| EC-C3 | Payment succeeds after `past_due` | Banner disappears; Pro unlocks | Status returns `active`; no data migration needed |
| EC-C4 | Provider webhook duplicated | No duplicate user-visible event | Billing event handling idempotent by provider event ID |
| EC-C5 | Provider unavailable during checkout | Friendly retry | No plan change until confirmed event/admin override |

### D. Abuse and Security

| ID | Condition | Expected UI | Expected system |
| -- | --------- | ----------- | --------------- |
| EC-D1 | User tampers client plan JSON | No unlock | Server entitlement check controls every gated endpoint |
| EC-D2 | User tries another user's PDF ID | Generic not found/forbidden | Ownership check remains `userId` scoped |
| EC-D3 | Pro account exceeds rate limit | Rate-limit copy, not billing copy | Existing `AiGenerateRateLimitLive` still applies |
| EC-D4 | Many Free accounts from same IP | Normal UI per account | Global/IP heuristics can block abuse separately from plan |
| EC-D5 | Suspended account still has paid status | Account blocked copy | Abuse/suspension overrides subscription entitlement |

### E. Offline / Local Dev / Dev Auth

| ID | Condition | Expected UI | Expected system |
| -- | --------- | ----------- | --------------- |
| EC-E1 | Local dev with `DEV_AUTH_ENABLED=true` | Dev user can switch/test plan via seed/config | No real provider needed |
| EC-E2 | Missing billing provider env in dev | App starts in stub mode if explicitly configured | Production startup must fail if live billing required but missing |
| EC-E3 | Teacher goes offline before generate | Browser/network error | No reservation if request never reaches API |
| EC-E4 | Offline after async job starts | Progress may stop | Server job continues; quota commit follows job result |

---

## 6. Acceptance Criteria / Definition of Done for MVP

### 6.1 Data and Contracts

- [ ] Shared schemas define `PlanCode`, `SubscriptionStatus`, `EntitlementSummary`, `UsageBucket`, and typed gate errors using Effect Schema.
- [ ] New entity IDs are branded in `packages/shared/src/schemas/entities.ts` when exposed across packages.
- [ ] Drizzle migrations add subscription state and usage ledger tables without modifying better-auth tables directly.
- [ ] Minimal subscription table stores `userId`, `plan`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `paidThrough`, provider IDs, and timestamps.
- [ ] Usage ledger supports reservation/commit/release for `sheet_generate` and `ai_assist` actions.
- [ ] Existing generated exams remain owned by `exams.userId`; no migration changes exam ownership semantics.

### 6.2 API / Service Layer

- [ ] Add `EntitlementService` and `BillingService` boundaries under `apps/api/src/api/services/` and compose them in `AppLayer.ts`.
- [ ] Gated handlers check entitlement server-side before expensive work: AI generate, question regenerate, PDF uploads/use, authenticated export, custom templates, and analytics export/deep views.
- [ ] `POST /api/ai/generate` reserves quota before `generateExam(...)` calls `AiClient` and releases on system failure.
- [ ] Async `generation_jobs` commit quota once per job, not once per poll.
- [ ] HTTP errors are typed with stable codes: `PLAN_LIMIT_EXCEEDED`, `FEATURE_GATED`, and existing rate-limit codes remain distinct.
- [ ] Authorization remains based on better-auth session via `CurrentUser`; no parallel auth system is introduced.

### 6.3 Web UX

- [ ] Dashboard and `/generate` display plan badge, remaining quota, and reset date.
- [ ] Free locked controls are visible but disabled with concise Indonesian copy.
- [ ] Free can complete: default Buku Siswa generate -> review -> finalize -> browser print.
- [ ] Pro can complete: PDF upload/library -> combine generate -> review -> export PDF/DOCX.
- [ ] Downgraded/past-due users can still open and browser-print historical exams.
- [ ] Upgrade CTA is present at blocked moments, but does not interrupt normal Free flow before the user hits a limit.

### 6.4 Billing MVP Boundary

- [ ] Code MVP supports a stub/manual provider mode for tests and staging.
- [ ] Production mode has an explicit provider configuration check; missing required env fails startup or disables checkout with operator-visible error.
- [ ] Provider callbacks or manual overrides are idempotent.
- [ ] No secrets are stored in repo files; public examples only list variable names.

### 6.5 Testing and Verification

- [ ] Regression tests prove Free allowed path works end-to-end at API level.
- [ ] Tests prove Free quota exhaustion prevents `AiClient` invocation.
- [ ] Tests prove Pro unlocks PDF source modes and export endpoints.
- [ ] Tests cover reservation release on AI failure and single commit for async job polling.
- [ ] Tests cover downgrade/payment grace semantics for historical exam access.
- [ ] Web tests cover locked-state copy and disabled controls on `/generate`.
- [ ] Browser verification covers Free generate/print and Pro PDF/export flows with no console errors.
- [ ] `pnpm lint`, `pnpm effect:check`, `pnpm type-check`, and `pnpm test` pass before shipping code.

### 6.6 MVP Done When

MVP is done when a tester can create two users in local/staging, one Free and one Pro, and verify:

1. Free can generate and print a default Buku Siswa exam until monthly quota is exhausted.
2. Exhausted Free user sees clear upgrade copy and no AI provider call is made.
3. Pro can generate up to 50 questions using `pdf_guru` or `combine` and export PDF/DOCX.
4. Downgrade/payment failure blocks new Pro actions but preserves historical exam access.
5. Usage counters are correct across sync generate, async generate, failure, refresh, and two-tab scenarios.

---

## 7. Open Questions

| Question | Why it matters |
| -------- | -------------- |
| Should Pro launch at Rp49.000/month or test a lower intro price for the first school year? | Price sensitivity among individual guru is high. |
| Which Indonesian payment provider should production use first? | Code MVP can stub, but production needs checkout and webhook decisions. |
| Should Free receive one PDF-guru trial per account? | Could improve conversion, but increases cost and abuse surface. |
| Should public Bank Soal reuse become Pro later? | It has value, but keeping sharing free may improve acquisition. |
| What support channel is realistic for Pro: email only or WhatsApp business? | User expectation in Indonesia often favors WhatsApp. |
