import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assessProbe, probeTable } from "./deploy-gate.mjs"

const attempts = Number(process.env["SMOKE_ATTEMPTS"] ?? "30")
const pauseSeconds = Number(process.env["SMOKE_PAUSE_SECONDS"] ?? "5")

function readBody(path) {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return ""
  }
}

function curlProbe(probe) {
  const dir = mkdtempSync(join(tmpdir(), "smoke-"))
  const bodyPath = join(dir, "body")
  const run = spawnSync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--location",
      "--max-redirs",
      "1",
      "--output",
      bodyPath,
      "--write-out",
      "%{http_code} %{num_redirects}",
      "--max-time",
      "20",
      probe.url
    ],
    { encoding: "utf8" }
  )
  const body = readBody(bodyPath)
  rmSync(dir, { recursive: true, force: true })

  if (run.status === 47) {
    return assessProbe({ status: 308, redirects: 2, body, expectShell: probe.expectShell })
  }

  const [statusText, redirectText] = (run.stdout ?? "").trim().split(/\s+/)
  const status = Number(statusText)
  const redirects = Number(redirectText)
  if (run.status !== 0 || !Number.isInteger(status) || !Number.isInteger(redirects)) {
    return assessProbe({ status: 0, redirects: 0, body, expectShell: probe.expectShell })
  }
  return assessProbe({ status, redirects, body, expectShell: probe.expectShell })
}

function sleep(seconds) {
  spawnSync("sleep", [String(seconds)])
}

const probes = probeTable({
  webOrigin: process.env["WEB_ORIGIN"] ?? "https://ujian-sekolah.naufaldi.com",
  apiHealthUrl: process.env["API_HEALTH_URL"] ?? "https://api-ujian-sekolah.naufaldi.com/api/health"
})

for (let attempt = 1; attempt <= attempts; attempt++) {
  const failed = []
  for (const probe of probes) {
    const result = curlProbe(probe)
    if (result.ok) {
      console.log(`${probe.name} ok ${probe.url}`)
      continue
    }
    console.error(`${probe.name} ${probe.url} ${result.reason}`)
    failed.push(result)
  }
  if (failed.length === 0) {
    console.log("smoke ok")
    process.exit(0)
  }
  const hardFailure = failed.some((result) => result.reason !== "status 0")
  if (hardFailure || attempt === attempts) process.exit(1)
  console.error(`smoke attempt ${attempt}/${attempts} still booting`)
  sleep(pauseSeconds)
}
