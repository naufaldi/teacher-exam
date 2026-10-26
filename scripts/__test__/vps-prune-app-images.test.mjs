import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const scriptPath = join(import.meta.dirname, "../vps-prune-app-images.sh")
const repository = "naufaldi/teacher-exam"
const apiRepo = `ghcr.io/${repository}/teacher-exam-api`
const webRepo = `ghcr.io/${repository}/teacher-exam-web`
const current = "34a20a4725b017d1e794a510396c0328d6b12d3e"
const rollback = "29ff759f374a6c55961c53c8007c46ebf59684e0"
const oldOpenAi = "22ab4081336baaba826a2ae932b31bbb9fd67fea"
const oldDiagram = "753efb290323f74974e6eedb28330b2361a90e96"
const oldThird = "421b2a9f9ab773b7aa2071da89903c47821aa7f0"

function imageLine(repo, tag, id) {
  return `${repo}|${tag}|${id}`
}

function appImages({ currentId = "aaa111111111", latestId = "aaa111111111", rollbackId = "bbb222222222" } = {}) {
  const rows = []
  for (const repo of [apiRepo, webRepo]) {
    const suffix = repo.endsWith("web") ? "w" : "a"
    rows.push(imageLine(repo, current, `${currentId}${suffix}`))
    rows.push(imageLine(repo, "latest", `${latestId}${suffix}`))
    rows.push(imageLine(repo, rollback, `${rollbackId}${suffix}`))
    rows.push(imageLine(repo, oldOpenAi, `ccc333333333${suffix}`))
    rows.push(imageLine(repo, oldDiagram, `ddd444444444${suffix}`))
    rows.push(imageLine(repo, oldThird, `eee555555555${suffix}`))
  }
  rows.push(imageLine("postgres", "16", "fff666666666"))
  rows.push(imageLine("caddy", "alpine", "ggg777777777"))
  return rows
}

function writeFakeDocker(binDir) {
  const docker = join(binDir, "docker")
  writeFileSync(
    docker,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$DOCKER_LOG"
if [ "$1" = "image" ] && [ "$2" = "ls" ]; then
  cat "$DOCKER_IMAGE_LS"
  exit 0
fi
if [ "$1" = "ps" ]; then
  cat "$DOCKER_PS"
  exit 0
fi
if [ "$1" = "image" ] && [ "$2" = "rm" ]; then
  exit 0
fi
echo "unexpected docker $*" >&2
exit 1
`
  )
  chmodSync(docker, 0o755)
}

function runPrune(env) {
  const dir = mkdtempSync(join(tmpdir(), "vps-prune-"))
  const bin = join(dir, "bin")
  spawnSync("mkdir", ["-p", bin])
  writeFakeDocker(bin)
  const log = join(dir, "docker.log")
  writeFileSync(log, "")
  writeFileSync(join(dir, "images"), `${(env.images ?? []).join("\n")}\n`)
  writeFileSync(join(dir, "running"), `${(env.running ?? []).join("\n")}\n`)
  if (env.previousFile !== undefined) {
    writeFileSync(join(dir, ".deploy-previous-tag"), env.previousFile)
  }
  const run = spawnSync("sh", [scriptPath], {
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: `${bin}:${process.env.PATH ?? ""}`,
      DOCKER_LOG: log,
      DOCKER_IMAGE_LS: join(dir, "images"),
      DOCKER_PS: join(dir, "running"),
      GITHUB_REPOSITORY: env.repository ?? repository,
      IMAGE_TAG: env.imageTag === undefined ? current : env.imageTag,
      ...(env.previousTag === undefined ? {} : { PREVIOUS_TAG: env.previousTag })
    }
  })
  const commands = readFileSync(log, "utf8").split("\n").filter((line) => line.length > 0)
  rmSync(dir, { recursive: true, force: true })
  return { status: run.status, stdout: run.stdout, stderr: run.stderr, commands }
}

function removed(commands) {
  return commands.filter((line) => line.startsWith("image rm ")).map((line) => line.slice("image rm ".length)).sort()
}

test("a good deploy removes old app tags and keeps the running image and the rollback image", () => {
  const run = runPrune({
    images: appImages(),
    running: [`${apiRepo}:${current}`, `${webRepo}:${current}`],
    previousTag: rollback
  })
  assert.equal(run.status, 0)
  assert.deepEqual(removed(run.commands), [
    `${apiRepo}:${oldOpenAi}`,
    `${apiRepo}:${oldThird}`,
    `${apiRepo}:${oldDiagram}`,
    `${webRepo}:${oldOpenAi}`,
    `${webRepo}:${oldThird}`,
    `${webRepo}:${oldDiagram}`
  ])
  assert.equal(run.commands.some((line) => line.includes("prune")), false)
  assert.equal(run.commands.some((line) => line.includes("postgres")), false)
  assert.equal(run.commands.some((line) => line.includes("caddy")), false)
  assert.equal(run.commands.some((line) => line.includes(current)), false)
  assert.equal(run.commands.some((line) => line.includes(rollback)), false)
  assert.equal(run.commands.some((line) => line.includes("latest")), false)
})

test("an approved old tag stays when it is the running image or the rollback image", () => {
  const runningOld = runPrune({
    images: appImages({ currentId: "ccc333333333" }),
    running: [`${apiRepo}:${oldOpenAi}`, `${webRepo}:${oldOpenAi}`],
    imageTag: oldOpenAi,
    previousTag: rollback
  })
  assert.equal(runningOld.status, 0)
  assert.equal(removed(runningOld.commands).some((ref) => ref.endsWith(`:${oldOpenAi}`)), false)

  const rollbackOld = runPrune({
    images: appImages(),
    running: [`${apiRepo}:${current}`, `${webRepo}:${current}`],
    previousTag: oldDiagram
  })
  assert.equal(rollbackOld.status, 0)
  assert.equal(removed(rollbackOld.commands).some((ref) => ref.endsWith(`:${oldDiagram}`)), false)
  assert.equal(removed(rollbackOld.commands).some((ref) => ref.endsWith(`:${oldThird}`)), true)
})

test("a running container keeps its image even when that tag is not current or rollback", () => {
  const run = runPrune({
    images: appImages(),
    running: [`${apiRepo}:${oldThird}`, `${webRepo}:${current}`],
    previousTag: rollback
  })
  assert.equal(run.status, 0)
  assert.equal(removed(run.commands).includes(`${apiRepo}:${oldThird}`), false)
  assert.equal(removed(run.commands).includes(`${webRepo}:${oldThird}`), true)
})

test("the rollback tag is read from .deploy-previous-tag when PREVIOUS_TAG is unset", () => {
  const run = runPrune({
    images: appImages(),
    running: [`${apiRepo}:${current}`],
    previousFile: `${rollback}\n`
  })
  assert.equal(run.status, 0)
  assert.equal(removed(run.commands).some((ref) => ref.endsWith(`:${rollback}`)), false)
  assert.equal(removed(run.commands).some((ref) => ref.endsWith(`:${oldOpenAi}`)), true)
})

test("an unsafe or missing tag removes nothing", () => {
  const missing = runPrune({ images: appImages(), running: [], imageTag: "" })
  assert.equal(missing.status, 1)
  assert.deepEqual(removed(missing.commands), [])

  const unsafe = runPrune({
    images: appImages(),
    running: [`${apiRepo}:${current}`],
    previousTag: "29ff759;docker image prune -af"
  })
  assert.equal(unsafe.status, 1)
  assert.deepEqual(removed(unsafe.commands), [])
  assert.equal(unsafe.commands.some((line) => line.includes("prune")), false)
})

test("the deploy workflow prunes old app images only after a good deploy", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/deploy.yml", import.meta.url), "utf8")
  const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8")
  const scriptAt = workflow.indexOf("sh scripts/vps-prune-app-images.sh")
  const rollbackAt = workflow.indexOf("Roll back to the previous image")
  const smokeAt = workflow.indexOf("Smoke public routes")
  assert.ok(smokeAt > 0)
  assert.ok(rollbackAt > smokeAt)
  assert.ok(scriptAt > rollbackAt)
  assert.match(workflow, /name: Prune old app images[\s\S]*if: success\(\)/)
  assert.equal(workflow.includes("docker image prune -af"), false)
  assert.equal(workflow.includes("docker builder prune -af"), false)
  assert.match(ci, /vps-prune-app-images\.test\.mjs/)
  assert.equal(readFileSync(scriptPath, "utf8").includes("prune -af"), false)
})
