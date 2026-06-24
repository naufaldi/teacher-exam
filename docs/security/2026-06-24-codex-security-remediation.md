# Codex Security Remediation Write-up

Date: 2026-06-24

This write-up documents remediation for the Codex Security standard scan findings from scan `43a27be6-86e9-49c9-b4ba-34c829206ebd`.

This is not a postmortem. The scan validated repository vulnerabilities, but there is no confirmed production incident in the available evidence.

## Source Artifacts

Generated scan artifacts were left untouched. Local references:

- [Generated report](/private/var/folders/39/sdym6xy92x90bv9qlv4nxg_r0000gn/T/codex-security-scans-ZGK4Cc/teacher-exam/47b28a5633b0410f611354135ad5faa8c8044ca4_20260623T081755Z_6oduk7i8/report.md)
- [Findings JSON](/private/var/folders/39/sdym6xy92x90bv9qlv4nxg_r0000gn/T/codex-security-scans-ZGK4Cc/teacher-exam/47b28a5633b0410f611354135ad5faa8c8044ca4_20260623T081755Z_6oduk7i8/findings.json)
- [Coverage JSON](/private/var/folders/39/sdym6xy92x90bv9qlv4nxg_r0000gn/T/codex-security-scans-ZGK4Cc/teacher-exam/47b28a5633b0410f611354135ad5faa8c8044ca4_20260623T081755Z_6oduk7i8/coverage.json)
- [Scan manifest](/private/var/folders/39/sdym6xy92x90bv9qlv4nxg_r0000gn/T/codex-security-scans-ZGK4Cc/teacher-exam/47b28a5633b0410f611354135ad5faa8c8044ca4_20260623T081755Z_6oduk7i8/scan-manifest.json)

## Findings and Fixes

### 1. Spoofable forwarded headers bypassed public bank rate limiting

Severity: medium

Root cause: `GET /api/bank/public` was anonymous and DB-backed. Its public-bank limiter used `x-forwarded-for` or `x-real-ip` directly as the limiter key, so a caller could rotate those headers and create fresh buckets.

Patch: the public bank limiter now uses a stable anonymous fallback key unless the app has a trusted-proxy identity contract. This prevents client-supplied forwarding headers from influencing rate-limit identity.

Remaining risk: this is conservative and shares one anonymous public-bank bucket at the app layer. If the app later needs accurate per-client anonymous limits, add an explicit trusted-proxy allowlist/header contract and tests before trusting forwarded headers again.

### 2. Curriculum validation could amplify authenticated requests into AI calls

Severity: low

Root cause: `POST /api/exams/:id/validate-curriculum` performed AI-backed validation but only had the group-level authorization and global limiter. The stricter AI limiter already existed but was only wired to `/api/ai/generate`.

Patch: the validation endpoint now uses `AiGenerateRateLimit` in addition to the existing authenticated exams group controls.

Remaining risk: this reuses the existing AI generation budget. If validation should have a separate quota later, introduce a dedicated limiter constant and route middleware.

### 3. Curriculum downloader accepted decoded traversal filenames

Severity: low

Root cause: the SIBI downloader validated the official PDF URL before decoding the URL basename. An encoded slash such as `%2f` could become a path separator after `decodeURIComponent`, and the decoded filename was joined into the output directory.

Patch: decoded filenames are sanitized as plain `.pdf` basenames, unsafe catalogue rows are rejected during classification, and the final resolved output path must remain inside `pdfDir` before writing.

Remaining risk: this protects the local acquisition script. It does not validate the semantic content of official PDFs beyond the existing PDF header/content-type checks.

## Verification

Regression tests were added before patching and confirmed red:

- forwarded-header rotation expected `429` but received `200`
- repeated curriculum validation expected the AI limiter to return `429`
- encoded traversal filename expected an unsafe filename error but no error was thrown

Focused verification after patch:

- `pnpm --filter @teacher-exam/api test -- bank-public`: passed, 69 files and 441 tests
- `pnpm --filter @teacher-exam/api test -- exams.validate-curriculum`: passed, 69 files and 441 tests
- `pnpm --filter @teacher-exam/api test -- curriculum-download-books`: passed, 69 files and 441 tests

Final verification results:

- `pnpm --filter @teacher-exam/api type-check`: passed
- `pnpm --filter @teacher-exam/api test`: passed, 69 files and 441 tests
- `pnpm effect:check`: passed, 315 files checked
- `pnpm lint`: passed

Frontend browser verification is not required for this remediation because no frontend route, component, form, or browser API call changed.
