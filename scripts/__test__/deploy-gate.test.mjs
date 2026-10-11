import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  assessProbe,
  isBootFailure,
  planRollback,
  probeTable,
  productionCaddyImage,
  rollbackCommand
} from "../deploy-gate.mjs"

test("production caddy image is the runtime image in the web Dockerfile", () => {
  const dockerfile = readFileSync(new URL("../../apps/web/Dockerfile", import.meta.url), "utf8")
  assert.equal(productionCaddyImage(dockerfile), "caddy:alpine")
})

test("cloudflare origin errors during boot are retried and a redirect loop is not", () => {
  assert.equal(isBootFailure({ ok: false, reason: "status 0" }), true)
  assert.equal(isBootFailure({ ok: false, reason: "status 502" }), true)
  assert.equal(isBootFailure({ ok: false, reason: "status 525" }), true)
  assert.equal(isBootFailure({ ok: false, reason: "status 308" }), false)
  assert.equal(isBootFailure({ ok: false, reason: "redirect loop" }), false)
  assert.equal(isBootFailure({ ok: false, reason: "missing app shell" }), false)
})

test("a brotli encode directive is not a passing probe", () => {
  assert.deepEqual(
    assessProbe({ status: 308, redirects: 1, body: "<html></html>", expectShell: true }),
    { ok: false, reason: "status 308" }
  )
  assert.deepEqual(
    assessProbe({ status: 308, redirects: 2, body: "", expectShell: true }),
    { ok: false, reason: "redirect loop" }
  )
})

test("home and share require the app shell and 200 with at most one redirect", () => {
  const shell = "<div id=\"root\"></div>"
  assert.deepEqual(
    assessProbe({ status: 200, redirects: 0, body: shell, expectShell: true }),
    { ok: true, reason: "ok" }
  )
  assert.deepEqual(
    assessProbe({ status: 200, redirects: 1, body: shell, expectShell: true }),
    { ok: true, reason: "ok" }
  )
  assert.deepEqual(
    assessProbe({ status: 200, redirects: 0, body: "<html></html>", expectShell: true }),
    { ok: false, reason: "missing app shell" }
  )
  assert.deepEqual(
    assessProbe({ status: 200, redirects: 0, body: "favicon", expectShell: false }),
    { ok: true, reason: "ok" }
  )
})

test("public smoke probes are home, a share path, a static asset, and api health", () => {
  const probes = probeTable({
    webOrigin: "https://ujian-sekolah.naufaldi.com",
    apiHealthUrl: "https://api-ujian-sekolah.naufaldi.com/api/health"
  })
  assert.deepEqual(probes, [
    { name: "home", url: "https://ujian-sekolah.naufaldi.com/", expectShell: true },
    { name: "share", url: "https://ujian-sekolah.naufaldi.com/share/smoke", expectShell: true },
    { name: "asset", url: "https://ujian-sekolah.naufaldi.com/favicon.svg", expectShell: false },
    { name: "api", url: "https://api-ujian-sekolah.naufaldi.com/api/health", expectShell: false }
  ])
  assert.equal(JSON.stringify(probes).includes("/health/ai"), false)
})

test("the AI model probe runs inside the API container against loopback", () => {
  const script = readFileSync(new URL("../ai-live-smoke.sh", import.meta.url), "utf8")
  const workflow = readFileSync(new URL("../../.github/workflows/deploy.yml", import.meta.url), "utf8")
  const smoke = readFileSync(new URL("../deploy-smoke.mjs", import.meta.url), "utf8")

  assert.match(script, /docker exec teacher-exam-api-1/)
  assert.match(script, /http:\/\/127\.0\.0\.1:3001\/api\/health\/ai-live/)
  assert.match(script, /gpt-6-luna/)
  assert.match(script, /status !== 200/)
  assert.equal(script.includes("api-ujian-sekolah"), false)
  assert.equal(smoke.includes("/api/health/ai"), false)

  const probeAt = workflow.indexOf("scripts/ai-live-smoke.sh")
  const rollbackAt = workflow.indexOf("Roll back to the previous image")
  assert.ok(probeAt > 0)
  assert.ok(rollbackAt > probeAt)
})

test("an AI probe fails the deploy when the model is missing or the status is not 200", () => {
  assert.deepEqual(
    assessProbe({
      status: 200,
      redirects: 0,
      body: JSON.stringify({ status: "ok", provider: "openai", model: "gpt-6-luna" }),
      expectShell: false,
      expectText: "gpt-6-luna"
    }),
    { ok: true, reason: "ok" }
  )
  assert.deepEqual(
    assessProbe({
      status: 200,
      redirects: 0,
      body: JSON.stringify({ model: "gpt-5.4-mini" }),
      expectShell: false,
      expectText: "gpt-6-luna"
    }),
    { ok: false, reason: "missing ai model" }
  )
  assert.deepEqual(
    assessProbe({
      status: 502,
      redirects: 0,
      body: "Kredit penyedia AI habis. Isi saldo, lalu coba generate lagi.",
      expectShell: false,
      expectText: "gpt-6-luna"
    }),
    { ok: false, reason: "status 502" }
  )
})

test("a failed smoke restores the previous image tag", () => {
  assert.deepEqual(planRollback({ previousTag: "abc123", nextTag: "def456", smokeOk: false }), {
    action: "restore",
    tag: "abc123"
  })
  assert.equal(
    rollbackCommand("abc123"),
    "IMAGE_TAG=abc123 docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
  )
})

test("a passed smoke keeps the new image tag", () => {
  assert.deepEqual(planRollback({ previousTag: "abc123", nextTag: "def456", smokeOk: true }), {
    action: "keep",
    tag: "def456"
  })
})

test("rollback aborts when there is no previous tag", () => {
  assert.deepEqual(planRollback({ previousTag: "", nextTag: "def456", smokeOk: false }), {
    action: "abort",
    reason: "no previous image tag"
  })
})

test("dry-run rollback prints the restore command and does not require docker", () => {
  const run = spawnSync("sh", ["scripts/vps-rollback.sh"], {
    encoding: "utf8",
    env: { ...process.env, DRY_RUN: "1", PREVIOUS_TAG: "abc123" }
  })
  assert.equal(run.status, 0)
  assert.equal(
    run.stdout,
    "IMAGE_TAG=abc123 docker compose -f docker-compose.prod.yml --env-file .env.production up -d\n"
  )
})

test("dry-run rollback refuses a missing tag", () => {
  const run = spawnSync("sh", ["scripts/vps-rollback.sh"], {
    encoding: "utf8",
    env: { ...process.env, DRY_RUN: "1", PREVIOUS_TAG: "" }
  })
  assert.equal(run.status, 1)
  assert.match(run.stderr, /no previous image tag/)
})
