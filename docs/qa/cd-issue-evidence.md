# C/D Issue Evidence

## Already Verified D1-D4

- D1: `FigureSpecSchema` supports the geometry figure shapes. Verified by `packages/shared/src/schemas/__test__/figures.test.ts`.
- D2: `renderFigureSvg` produces deterministic SVG. Verified by `apps/web/src/lib/__test__/figure-renderer.test.ts`.
- D3: the AI prompt includes optional `figure` JSON instructions. Verified by `apps/api/src/lib/__test__/prompt.test.ts`.
- D4: the AI route removes invalid figure specs and marks `needs_review`. Verified by `apps/api/src/routes/__test__/ai.test.ts`.

## Added For C/D Completion

- C1/C2: Matematika shared subject, DB enum migration, and curriculum corpus.
- C3/C4: KaTeX rendering in Review, Preview, public share, and print-backed Preview DOM.
- C5/C6: Matematika prompt rules plus server-side LaTeX validation and retry behavior.
- C7/C9/D5: Matematika selectable in Generate with non-diagram and diagram topics.
- D7: Review and Preview route tests assert `[data-figure-svg]` rendering for generated figure specs.
- C8/D6: fixture QA script and human review checklists under `docs/qa`.
