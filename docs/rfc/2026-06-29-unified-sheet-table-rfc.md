# RFC: Unified SheetTable + Modal-First Preview

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Scope** | Dashboard Riwayat Terbaru, Riwayat, Bank Saya, Bank Publik |

## Summary

Replace three parallel table implementations with one `SheetTable` component driven by variant config. Preview for Final lembar uses `SheetPreviewDialog` (modal-first); `/preview` remains the print/export page.

## Technical decisions

1. **`SheetTable` + variants** — `dashboard-recent`, `history`, `bank-mine`, `bank-public`
2. **`SheetTableRow` view-model** — adapters from `Exam` and `BankSheet`
3. **Action config** — `getSheetColumns()` + `getSheetActions()` per variant × row state
4. **Modal-first preview** — title click / Pratinjau → `SheetPreviewDialog`; footer **Buka halaman cetak** → `/preview`
5. **Draft rows** — title / Edit → `/review`
6. **Pakai lembar** — clone → `/preview` (new exam id), no modal
7. **`questionCount` on exam list** — `GET /api/exams` returns optional `questionCount` (accepted questions)

## New modules

| Path | Role |
|------|------|
| `apps/web/src/components/sheet/sheet-table.tsx` | Unified table UI |
| `apps/web/src/components/sheet/sheet-table.types.ts` | Types |
| `apps/web/src/components/sheet/sheet-table.adapters.ts` | `examToSheetRow`, `bankSheetToSheetRow` |
| `apps/web/src/components/sheet/sheet-table.actions.ts` | Column/action matrix |
| `apps/web/src/components/sheet/sheet-preview-dialog.tsx` | Shared preview modal |
| `apps/web/src/components/sheet/use-sheet-preview.ts` | Modal state hook |
| `apps/web/src/components/sheet/use-sheet-table-handlers.ts` | Navigation handlers |

## Supersession table

| Superseded | Replaced by |
|------------|-------------|
| `HistoryTable`, `ExamHistoryRow`, `BankSheetTable` | `SheetTable` + variant |
| `BankSheetPreviewDialog` (bank-only) | `SheetPreviewDialog` |
| History/Dashboard eye → `/preview` navigate | Modal-first `SheetPreviewDialog` |
| History Soal column hardcoded `20` | `exam.questionCount` from API |

## Removed files

- `apps/web/src/components/dashboard/exam-history-row.tsx`
- `apps/web/src/components/history/history-table.tsx`
- `apps/web/src/components/bank/bank-sheet-table.tsx`
- `apps/web/src/components/bank/bank-sheet-preview-dialog.tsx`

## Public page

`bank-soal-publik` uses `bank-public` + `readOnly`; modal hides **Buka halaman cetak** footer.

## Public share page

`/share/:slug` is the anonymous read/print surface for exam links copied from Riwayat **Bagikan**. Layout parity with `/preview` (not the modal). See [RFC 2026-06-29-public-exam-share](2026-06-29-public-exam-share-rfc.md).

## Related

- Design spec: [2026-06-29-unified-sheet-table-design.md](../superpowers/specs/2026-06-29-unified-sheet-table-design.md)
- Bank addendum: [bank-soal-core-design.md](../superpowers/specs/2026-05-27-bank-soal-core-design.md)
