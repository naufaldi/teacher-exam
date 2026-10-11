import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

function writeFakeDocker(binDir) {
  const docker = join(binDir, "docker")
  writeFileSync(
    docker,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$DOCKER_LOG"
if [ "$1" = "login" ]; then
  cat >> "$DOCKER_LOGIN_STDIN"
  exit 0
fi
if [ "$1" = "pull" ]; then
  left=$(cat "$DOCKER_FAILS")
  if [ "$left" -gt 0 ]; then
    printf '%s\\n' "$((left - 1))" > "$DOCKER_FAILS"
    echo "pull access denied" >&2
    exit 1
  fi
  exit 0
fi
exit 0
`
  )
  chmodSync(docker, 0o755)
}

function runPull(env) {
  const dir = mkdtempSync(join(tmpdir(), "vps-pull-"))
  const bin = join(dir, "bin")
  spawnSync("mkdir", ["-p", bin])
  writeFakeDocker(bin)
  const log = join(dir, "docker.log")
  const loginStdin = join(dir, "login.stdin")
  const fails = join(dir, "fails")
  writeFileSync(log, "")
  writeFileSync(loginStdin, "")
  writeFileSync(fails, String(env.failPulls ?? 0))
  const run = spawnSync("sh", ["scripts/vps-pull.sh"], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH ?? ""}`,
      DOCKER_LOG: log,
      DOCKER_LOGIN_STDIN: loginStdin,
      DOCKER_FAILS: fails,
      API_IMAGE: env.apiImage ?? "ghcr.io/naufaldi/teacher-exam/teacher-exam-api:79b7ee3",
      WEB_IMAGE: env.webImage ?? "ghcr.io/naufaldi/teacher-exam/teacher-exam-web:79b7ee3",
      GHCR_USER: env.user ?? "cursor",
      GHCR_TOKEN: env.token ?? "job-token",
      GHCR_PULL_TOKEN: env.pullToken ?? ""
    }
  })
  const commands = readFileSync(log, "utf8").split("\n").filter((line) => line.length > 0)
  const passwords = readFileSync(loginStdin, "utf8").split("\n").filter((line) => line.length > 0)
  rmSync(dir, { recursive: true, force: true })
  return { status: run.status, stdout: run.stdout, stderr: run.stderr, commands, passwords }
}

test("deploy pull prunes dangling images and does not untag serving images", () => {
  const run = runPull({ failPulls: 0 })
  assert.equal(run.status, 0)
  assert.deepEqual(
    run.commands.filter((line) => line.startsWith("image prune")),
    ["image prune -f"]
  )
  assert.equal(run.commands.some((line) => line.includes("prune -a")), false)
  assert.equal(run.commands.some((line) => line.startsWith("rmi") || line.includes("image rm")), false)
  assert.equal(run.commands.some((line) => line.includes("builder")), false)
})

test("a failed pull re-logins and retries at most three times", () => {
  const recovered = runPull({ failPulls: 2 })
  assert.equal(recovered.status, 0)
  assert.deepEqual(recovered.passwords, ["job-token", "job-token", "job-token"])
  assert.equal(recovered.commands.filter((line) => line.startsWith("pull ")).length, 4)
  assert.match(recovered.stderr, /re-login/)

  const exhausted = runPull({ failPulls: 3 })
  assert.equal(exhausted.status, 1)
  assert.deepEqual(exhausted.passwords, ["job-token", "job-token", "job-token"])
  assert.equal(exhausted.commands.filter((line) => line.startsWith("pull ")).length, 3)
  assert.equal(
    exhausted.commands.some((line) => line.includes("teacher-exam-web")),
    false
  )
})

test("a packages:read token is used for login when it is set", () => {
  const run = runPull({ failPulls: 1, pullToken: "packages-read-token" })
  assert.equal(run.status, 0)
  assert.deepEqual(run.passwords, ["packages-read-token", "packages-read-token"])
})

test("the deploy workflow does not full-prune images on every deploy", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/deploy.yml", import.meta.url), "utf8")
  assert.equal(workflow.includes("docker image prune -af"), false)
  assert.equal(workflow.includes("docker builder prune -af"), false)
  assert.match(workflow, /sh scripts\/vps-pull\.sh/)
})
