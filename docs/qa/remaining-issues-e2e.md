# Remaining issues — browser E2E evidence

Date: 2026-05-29  
Tool: `agent-browser`  
Web: `http://localhost:5173`  
API: `http://localhost:3000`

## Preconditions

```bash
DEV_AUTH_ENABLED=true
VITE_DEV_AUTH=true
pnpm db:seed:dev   # one-time
pnpm dev
```

Headless dev login:

```bash
agent-browser open http://localhost:5173/ \
  && agent-browser eval "fetch('/api/dev/login',{method:'POST',credentials:'include'}).then(r=>r.status)" \
  && agent-browser open http://localhost:5173/dashboard \
  && agent-browser wait --load networkidle \
  && agent-browser snapshot -i
```

Console hook (must stay clean):

```bash
agent-browser eval --stdin <<'EVALEOF'
(() => {
  const buf = (window.__agentLogs ||= []);
  if (!window.__agentLogsHooked) {
    window.__agentLogsHooked = true;
    for (const k of ['error', 'warn', 'log']) {
      const orig = console[k].bind(console);
      console[k] = (...a) => { buf.push({ k, a: a.map(String) }); orig(...a); };
    }
  }
  return buf;
})()
EVALEOF
```

---

## Issue #134 — dev login after Effect refactor

| Step | Status | Console | Screenshot |
|------|--------|---------|------------|
| `POST /api/dev/login` → `/dashboard` | Pass | Clean | `.agent-browser/issue-134-dev-login.png` |

```bash
agent-browser open http://localhost:5173/ \
  && agent-browser eval "fetch('/api/dev/login',{method:'POST',credentials:'include'}).then(r=>r.status)" \
  && agent-browser open http://localhost:5173/dashboard \
  && agent-browser wait --load networkidle \
  && agent-browser screenshot .agent-browser/issue-134-dev-login.png
```

---

## Issue #114 — Pembahasan SSE streaming

| Step | Status | Console | Screenshot |
|------|--------|---------|------------|
| Preview empty pembahasan | Pass | Clean | `.agent-browser/issue-114-pembahasan-before.png` |
| Mid-stream partial markdown | Pass | Clean | `.agent-browser/issue-114-pembahasan-streaming-mid.png` |
| Done — full markdown | Pass | Clean | `.agent-browser/issue-114-pembahasan-streaming-done.png` |

Flow:

1. Dev login (above)
2. Open finalized exam preview with `discussionMd: null`
3. Click **Generate Pembahasan**
4. Screenshot while button shows **Membuat Pembahasan...** and partial text is visible
5. Screenshot after completion

```bash
agent-browser open "http://localhost:5173/preview?examId=<EXAM_ID>" \
  && agent-browser wait --load networkidle \
  && agent-browser screenshot .agent-browser/issue-114-pembahasan-before.png
```

---

## Issue #116 — live AI smoke (optional browser)

After `pnpm --filter @teacher-exam/api qa:live-ai` succeeds locally, optional generate flow screenshot:

`.agent-browser/issue-116-live-generate-done.png`

Document `AI_PROVIDER` and env used in the command output log (no secrets in repo).
