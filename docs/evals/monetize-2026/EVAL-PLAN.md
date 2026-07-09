# EVAL-PLAN — Monetize stage-pair model eval

**Visibility: OPERATOR-ONLY (`eval-ops`). Never copy this file onto generator branches.**

Canonical contract for promote / continue / judge / writeup agents. Generators must not see this document.

Visual companion (ops): [`monetize-model-eval.canvas.tsx`](./monetize-model-eval.canvas.tsx) (also mirrored under Cursor canvases for live preview).

---

## 1. Locked decisions

| Decision | Value |
|----------|--------|
| Goal | Research writeup (artifacts + scores), **not** product merge to `main` |
| Theme | Free / Pro subscription + feature gates |
| Pairs | PRD A vs B · RFC C vs D · Code E vs F · Review G vs H |
| Judge | Blind LLM judge |
| Score shape | 5 × (1–10) + 1 essay per artifact |
| Baselines | RFC ← **always PRD A** · Code ← **PRD A + RFC C** · Review ← **code E** |
| Code output | Scoped real commits on throwaway branches |
| Kit home | `docs/evals/monetize-2026/` |

Fill vendor names in [`slot-map.md`](./slot-map.md).

---

## 2. Isolation

| Class | Paths | Who |
|-------|--------|-----|
| Generator-visible | `theme-brief.md`, `context-pack.md`, active `prompts/<stage>.md`, `baselines/` for that stage, allowlisted product files | Models A–H |
| Operator-only | `EVAL-PLAN.md`, `slot-map.md`, `rubrics/`, `judge/`, `scores/`, rival `artifacts/` copies, `WRITEUP.md`, full README | Ops / judge / writeup only |

**Pre-run on generator worktree:** no `EVAL-PLAN.md`, `rubrics/`, `judge/`, `scores/`, `WRITEUP.md`, rival artifacts. Fresh chat per candidate.

---

## 3. Slot identity (branch wins)

| Slot | Branch | Artifact |
|------|--------|----------|
| A | `prd-eval-model-a` | `artifacts/prd-a.md` |
| B | `prd-eval-model-b` | `artifacts/prd-b.md` |
| C | `rfc-eval-model-c` | `artifacts/rfc-c.md` |
| D | `rfc-eval-model-d` | `artifacts/rfc-d.md` |
| E | `code-eval-model-e` | commits (+ optional `artifacts/code-e-notes.md`) |
| F | `code-eval-model-f` | commits (+ optional notes) |
| G | `review-eval-model-g` | `artifacts/review-g.md` |
| H | `review-eval-model-h` | `artifacts/review-h.md` |

Winner never becomes the baseline. Always promote **A / C / E**.

---

## 4. Progress checklist

```text
[ ] eval-ops kit exists (this file present)
[ ] prd-eval setup exists (generator subset only)
[ ] prd-eval-model-a has artifacts/prd-a.md
[ ] prd-eval-model-b has artifacts/prd-b.md
[ ] scores/prd.json (merged) exists
[ ] rfc-eval has baselines/prd-a.md
[ ] rfc-eval-model-c / -d artifacts
[ ] scores/rfc.json
[ ] code-eval has baselines/prd-a.md + rfc-c.md
[ ] code-eval-model-e / -f commits
[ ] scores/code.json (+ type-check notes)
[ ] review-eval based on code E
[ ] review-eval-model-g / -h artifacts
[ ] scores/review.json
[ ] WRITEUP.md filled
```

First unchecked item after the user’s message = what “continue” means.

---

## 5. Continuation protocol (human mostly prompts)

Ops agent stays on **`eval-ops`** (or checks out as needed). Human says status + “continue”.

| User says (approx.) | Agent does |
|---------------------|------------|
| Start monetize PRD / Start PRD | Ensure kit; create `prd-eval` subset; `checkout -b prd-eval-model-a`; tell human: new chat, paste `prompts/01-prd.md` |
| PRD A done. Continue to B. | Verify/commit `prd-a.md` on model-a; create `prd-eval-model-b`; hand `01-prd.md` |
| PRD A and B done. Continue. | Judge PRD if needed → promote A → `rfc-eval` → prep `rfc-eval-model-c` + `02-rfc.md` |
| RFC C done. Continue to D. | Commit C; prep model-d |
| RFC C and D done. Continue. | Judge RFC → promote A+C → `code-eval` → prep E + `03-code.md` |
| Code E/F done. Continue. | Judge Code → `review-eval` from E → prep G + `04-review.md` |
| Reviews done. Continue. | Judge Review → WRITEUP |
| Score only / Promote only | Do that step only |
| Where are we? | Print checklist |

**Default:** agent prepares branches + paste instructions; human opens **new generator chats** for isolation. If human says “you run it”, use clean worktree with generator-visible files only.

After each continue, reply with: what was promoted · next branches · exact prompt path · scoring pending?

---

## 6. Turn-by-turn PRD example

```text
YOU (ops)              OPS AGENT                         YOU (generator)
Start monetize PRD  →  prd-eval-model-a + paste 01-prd
                       ─ ─ Model A chat ─ ─
                       paste 01-prd → prd-a.md
PRD A done. Continue to B.
                    →  commit A; checkout prd-eval-model-b
                       ─ ─ Model B chat ─ ─
                       paste 01-prd → prd-b.md
PRD A and B done. Continue.
                    →  commit B; judge; promote A → rfc-eval;
                       hand rfc-eval-model-c + 02-rfc.md
```

After PRD B there is **no PRD branch C** — next is RFC C/D.

---

## 7. Promote (human or agent)

Promote = copy baseline onto next **setup** branch. Not merge to `main`.

### PRD → RFC

```bash
git checkout prd-eval
git checkout -b rfc-eval   # or checkout rfc-eval
mkdir -p docs/evals/monetize-2026/baselines
git show prd-eval-model-a:docs/evals/monetize-2026/artifacts/prd-a.md \
  > docs/evals/monetize-2026/baselines/prd-a.md
# keep only prompts/02-rfc.md; strip EVAL-PLAN/rubrics/judge/scores
git add docs/evals/monetize-2026 && git commit -m "eval(rfc): setup with baseline PRD A"
```

### RFC → Code

```bash
git checkout rfc-eval && git checkout -b code-eval
git show rfc-eval-model-c:docs/evals/monetize-2026/artifacts/rfc-c.md \
  > docs/evals/monetize-2026/baselines/rfc-c.md
# ensure baselines/prd-a.md present; keep only prompts/03-code.md
git add docs/evals/monetize-2026 && git commit -m "eval(code): setup with PRD A + RFC C"
```

### Code → Review

```bash
git checkout code-eval-model-e
git checkout -b review-eval
# keep baselines; only prompts/04-review.md; strip ops files
git add -A && git commit -m "eval(review): setup from code E"
```

---

## 8. Rubric pointers

| Stage | File | Dimensions |
|-------|------|------------|
| PRD | `rubrics/prd.md` | case fit · edges · pain · scope · acceptance |
| RFC | `rubrics/rfc.md` | fidelity · arch · edges · phasing · implementable |
| Code | `rubrics/code.md` | RFC fit · stack · correctness · edges · diff |
| Review | `rubrics/review.md` | bugs · severity · grounding · fixes · FP control |

---

## 9. Blind judge protocol

1. Anonymize to Candidate X/Y (random order); no model names in judge chat.
2. Give: this plan §9 + stage rubric + both artifacts + baselines for stage.
3. Paste `judge/judge-prompt.md`; emit JSON per `judge/scorecard.template.md`.
4. Second pass with swapped order; if winner flips → `inconclusive: true`.
5. Merge on ops: map X/Y → slots via anonymization log; save `scores/<stage>.json`.
6. **Baseline for next stage stays A/C/E** even if B/D/F/H “won”.

---

## 10. Generator subset vs ops

When creating `prd-eval` from `eval-ops`, **keep**:

- `theme-brief.md`, `context-pack.md`, `prompts/01-prd.md`
- empty `baselines/` ok

**Remove from generator branches:**

- `EVAL-PLAN.md`, `slot-map.md`, `README.md` (full ops), `rubrics/`, `judge/`, `scores/`, `WRITEUP.md`
- Optional stub: short `GENERATOR.md` listing allowed inputs only (see repo file if present)

---

## 11. Edge cases

| Case | Action |
|------|--------|
| Empty / refused output | Score 0s + essay invalid; keep branch |
| Type-check fail on Code | Record fail; still judge soft dims |
| Ops files on generator tree | Invalidate run; strip; new chat |
| Missing baseline | Block next stage |
| User says continue early | Report checklist; do not skip required artifacts |

---

## 12. Definition of Done (one full eval)

- All eight slot artifacts (or documented skips)
- Four merged score files
- WRITEUP filled
- No monetize feature merged to `main` as part of research
- Generators never received this file
