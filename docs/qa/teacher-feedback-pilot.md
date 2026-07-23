# Teacher Feedback Pilot — Browser QA

**Tracking:** [#239](https://github.com/naufaldi/teacher-exam/issues/239)
**Primary route:** `/preview?examId=<owned-exam-id>`
**Form:** `https://forms.gle/B4s8x1G2UQM6me7z8`

## Preconditions

- migration `0020_add_exam_pilot_outcomes.sql` applied
- local root `.env` contains:

```dotenv
DEV_AUTH_ENABLED=true
VITE_DEV_AUTH=true
VITE_TEACHER_FEEDBACK_ENABLED=true
VITE_FEEDBACK_FORM_URL=https://forms.gle/B4s8x1G2UQM6me7z8
```

- dev teacher seeded with `pnpm db:seed:dev`
- `pnpm dev` running at web `:5173` and API `:3000`

## Desktop and mobile placement

Check Dashboard, Generate, Review, and Preview at desktop width and a mobile viewport.

- [ ] **Beri Masukan** remains bottom-right with its text label
- [ ] minimum touch target is 44px
- [ ] keyboard focus ring is visible
- [ ] link opens the form in a new tab
- [ ] action stays below active dialogs and notifications
- [ ] action is absent from print preview

## Export readiness flow

1. Generate a fresh sheet.
2. Complete Review and open Preview.
3. Export PDF.
4. Confirm the download succeeds before the prompt appears.
5. Confirm the prompt shows three neutral options.
6. Select **Ya, setelah diedit**.
7. Confirm only that option shows loading.
8. Confirm the success state and optional **Ceritakan lebih lanjut** link.
9. Close with **Selesai** and verify focus returns safely.

Repeat for DOCX.

## Print intent

1. Click **Cetak Soal**.
2. Cancel the browser print dialog.
3. Confirm the readiness prompt still appears.
4. Verify reporting records `print_intent`, not a completed print claim.

## Failure and dismissal

- [ ] failed PDF/DOCX export does not show readiness
- [ ] feedback API failure does not block a completed export or print dialog
- [ ] submission failure retains the selected answer and shows **Coba lagi**
- [ ] **Nanti saja** suppresses another prompt during the current Preview visit
- [ ] reopening Preview may prompt again until an answer exists
- [ ] an already-answered exam does not prompt

## Accessibility and motion

- [ ] complete the dialog using keyboard only
- [ ] option labels and descriptions are announced
- [ ] focus remains trapped while the dialog is open
- [ ] focus returns after close
- [ ] reduced-motion mode removes transform movement
- [ ] no pulse, bounce, confetti, or attention loop

## Reporting

Run:

```bash
pnpm --filter @teacher-exam/api feedback:report
pnpm --filter @teacher-exam/api feedback:report -- --format=csv
```

- [ ] exported denominator increments once per exam
- [ ] first trigger/time remain unchanged after repeat exports
- [ ] readiness updates the same record
- [ ] response rate and readiness percentages match the test actions
- [ ] CSV contains teacher email and exam metadata, not question/student content

## Clean-browser evidence

- [ ] no failed network requests
- [ ] no console errors or warnings
- [ ] screenshots captured for desktop, mobile, prompt, and success state
- [ ] final result and evidence paths recorded in this document

## Local verification record — 23 July 2026

Result: **passed** for the primary PDF pilot flow.

- Feedback action was visible on Dashboard, Generate, Review, and Preview.
- A 375 × 812 viewport retained the **Beri Masukan** label with a 44px-high
  touch target, 16px right/bottom offsets, and `z-index: 40`.
- PDF export completed before the readiness prompt opened.
- **Ya, setelah diedit** updated the same outcome record and rendered the
  success state.
- The report returned one exported sheet, one response, and 100%
  `ready_after_edit`.
- The verified route pass had no failed API requests, console errors, or
  console warnings.
- An accessibility warning discovered in the existing sheet Preview dialog was
  fixed by adding a dialog description and a regression test.

Evidence:

- `.agent-browser/teacher-feedback-dashboard-desktop.png`
- `.agent-browser/teacher-feedback-dashboard-mobile.png`
- `.agent-browser/teacher-feedback-readiness-dialog.png`
- `.agent-browser/teacher-feedback-readiness-success.png`

The DOCX, print-intent, failure, dismissal, and reduced-motion branches are
covered by automated component and route tests. Re-run their manual checklist
before enabling the production flag.
