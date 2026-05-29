#!/usr/bin/env node
/**
 * AGENTS.md Effect style checks not covered by @effect/eslint-plugin.
 */
import { execSync } from "node:child_process"
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"

const ROOT = new URL("..", import.meta.url).pathname

const SCAN_ROOTS = [
  join(ROOT, "apps/api/src"),
  join(ROOT, "packages/shared/src"),
  join(ROOT, "apps/web/src/lib"),
  join(ROOT, "apps/web/src/routes")
]

const EXT = /\.(ts|tsx)$/

async function walk(dir, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue
      await walk(path, out)
      continue
    }
    if (!EXT.test(entry.name)) continue
    out.push(path)
  }
  return out
}

function changedFiles(baseRef) {
  try {
    const out = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    })
    return new Set(
      out
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((file) => join(ROOT, file))
    )
  } catch {
    return null
  }
}

function checkFile(file, content) {
  const rel = relative(ROOT, file)
  const isApi = rel.startsWith("apps/api/")
  const isWeb = rel.startsWith("apps/web/")
  const lines = content.split("\n")
  const issues = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const n = i + 1

    if (/from\s+["']effect\//.test(line)) {
      issues.push({ rel, n, rule: "no-deep-effect-import", msg: "Use named imports from \"effect\" root" })
    }
    if (/from\s+["']effect\/Function["']/.test(line) || /\bflow\b/.test(line) && /from\s+["']effect/.test(line)) {
      issues.push({ rel, n, rule: "no-flow", msg: "Do not import or use flow from effect/Function" })
    }
    if (/import\s+\*\s+as\s+\w+\s+from\s+["']effect["']/.test(line)) {
      issues.push({ rel, n, rule: "no-effect-namespace", msg: "Use named imports from \"effect\" root" })
    }

    if (/switch\s*\([^)]*\._tag\s*\)/.test(line)) {
      issues.push({ rel, n, rule: "prefer-match", msg: "Use Match.exhaustive instead of switch on _tag" })
    }

    if (isApi && /Effect\.gen\s*\(function\*\(\)/.test(line)) {
      let depth = 0
      let started = false
      for (let j = i; j < Math.min(i + 120, lines.length); j++) {
        const genLine = lines[j]
        if (/function\*/.test(genLine)) started = true
        if (!started) continue
        depth += (genLine.match(/\{/g) ?? []).length
        depth -= (genLine.match(/\}/g) ?? []).length
        if (/\bthrow\b/.test(genLine)) {
          issues.push({
            rel,
            n: j + 1,
            rule: "no-throw-in-gen",
            msg: "Do not throw inside Effect.gen; use Effect.fail or Effect.die"
          })
        }
        if (started && depth <= 0 && j > i) break
      }
    }

    if (isWeb && rel.startsWith("apps/web/src/")) {
      if (/from\s+["']effect["']/.test(line)) {
        const banned = ["Layer", "Context", "Effect"]
        for (const sym of banned) {
          if (new RegExp(`\\b${sym}\\b`).test(line)) {
            if (sym === "Effect" && /Effect\.run(Promise|Fork|Sync)/.test(line)) {
              issues.push({
                rel,
                n,
                rule: "client-no-effect-runtime",
                msg: "Do not import Effect runtime helpers into web client"
              })
            } else if (sym !== "Effect") {
              issues.push({ rel, n, rule: "client-no-layer-context", msg: `Do not import ${sym} into web client` })
            }
          }
        }
      }
      if (/from\s+["']@effect\/platform-node["']/.test(line)) {
        issues.push({
          rel,
          n,
          rule: "client-no-platform-node",
          msg: "Do not import @effect/platform-node into web client"
        })
      }
    }
  }

  return issues
}

const ratchetOnly = process.argv.includes("--ratchet")
const baseRef = process.env["EFFECT_CHECK_BASE"] ?? "origin/main"
const changed = ratchetOnly ? changedFiles(baseRef) : null

const files = []
for (const root of SCAN_ROOTS) {
  await walk(root, files)
}

const targets = changed
  ? files.filter((file) => changed.has(file))
  : files

const allIssues = []
for (const file of targets) {
  const content = await readFile(file, "utf8")
  for (const issue of checkFile(file, content)) {
    allIssues.push(issue)
  }
}

if (allIssues.length > 0) {
  console.error(`Effect style check failed (${allIssues.length} issue(s)):`)
  for (const issue of allIssues) {
    console.error(`  ${issue.rel}:${issue.n} [${issue.rule}] ${issue.msg}`)
  }
  process.exit(1)
}

const mode = ratchetOnly ? `ratchet vs ${baseRef}` : "full"
console.log(`OK: effect style (${mode}, ${targets.length} file(s) checked)`)
