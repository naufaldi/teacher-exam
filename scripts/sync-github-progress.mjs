#!/usr/bin/env node
/**
 * Sync GitHub issue state → docs/ISSUE_INDEX.md → docs/ROADMAP.md overview table.
 * Optionally post rollup comments on RFC epic issues (#146–#150).
 *
 * Usage:
 *   node scripts/sync-github-progress.mjs [--dry-run] [--pr N] [--verify]
 */
import { execSync } from "node:child_process"
import { access, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const ROOT = new URL("..", import.meta.url).pathname
const INDEX_PATH = join(ROOT, "docs/ISSUE_INDEX.md")
const ROADMAP_PATH = join(ROOT, "docs/ROADMAP.md")

const EPIC_ISSUES = [146, 147, 148, 149, 150]
const ROADMAP_STATUS_BY_ROLLUP = {
  done: "✅ Done",
  in_progress: "🔄 In progress",
  not_started: "⬜ Not started",
  open: "🔄 In progress"
}

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const verify = args.includes("--verify")
const prIdx = args.indexOf("--pr")
const prNumber = prIdx >= 0 ? args[prIdx + 1] : undefined

function ghJson(cmd) {
  const out = execSync(`gh ${cmd}`, { encoding: "utf8", cwd: ROOT })
  return JSON.parse(out)
}

function parseIssueRows(markdown) {
  const lines = markdown.split("\n")
  const headerIdx = lines.findIndex((l) => l.startsWith("| milestone | epic | issue |"))
  if (headerIdx < 0) return { lines, headerIdx: -1, rows: [] }

  const rows = []
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith("|")) break
    const cols = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())
    if (cols.length < 7) continue
    rows.push({
      lineIdx: i,
      milestone: cols[0],
      epic: cols[1],
      issue: cols[2],
      title: cols[3],
      status: cols[4],
      code_signal: cols[5],
      closed_by: cols[6],
      raw: line
    })
  }
  return { lines, headerIdx, rows }
}

function parseOverviewRows(markdown) {
  const lines = markdown.split("\n")
  const headerIdx = lines.findIndex((l) => l.startsWith("| Milestone | Open | Closed |"))
  if (headerIdx < 0) return { lines, headerIdx: -1, rows: [] }

  const rows = []
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith("|")) break
    const cols = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())
    if (cols.length < 5) continue
    rows.push({
      lineIdx: i,
      milestone: cols[0],
      open: Number(cols[1]),
      closed: Number(cols[2]),
      partial: Number(cols[3]),
      rollup: cols[4],
      raw: line
    })
  }
  return { lines, headerIdx, rows }
}

function issueNumberFromCell(cell) {
  const m = cell.match(/#(\d+)/)
  return m ? Number(m[1]) : null
}

function fetchGhStates(issueNumbers) {
  if (issueNumbers.length === 0) return new Map()
  const nums = [...new Set(issueNumbers)].join(",")
  const issues = ghJson(
    `issue list --limit 200 --state all --json number,state --jq '[.[] | select(.number as $n | [${nums}] | index($n))]'`
  )
  const map = new Map()
  for (const item of issues) {
    map.set(item.number, item.state.toLowerCase())
  }
  return map
}

function rollupForMilestone(rows, milestoneKey) {
  const mRows = rows.filter((r) => r.milestone === milestoneKey)
  if (mRows.length === 0) return "not_started"

  const statuses = mRows.map((r) => r.status)
  if (statuses.every((s) => s === "closed")) return "done"
  if (statuses.some((s) => s === "partial")) return "in_progress"
  if (statuses.some((s) => s === "closed") && statuses.some((s) => s === "open")) return "in_progress"
  if (statuses.every((s) => s === "open")) return "not_started"
  return "in_progress"
}

function rebuildOverviewTable(overview, issueRows) {
  const newLines = [...overview.lines]

  for (const row of overview.rows) {
    const m = row.milestone
    const mRows = issueRows.filter((r) => r.milestone === m)
    const open = mRows.filter((r) => r.status === "open").length
    const closed = mRows.filter((r) => r.status === "closed").length
    const partial = mRows.filter((r) => r.status === "partial").length
    const rollup = rollupForMilestone(issueRows, m)
    newLines[row.lineIdx] = `| ${m} | ${open} | ${closed} | ${partial} | ${rollup} |`
  }
  return newLines.join("\n")
}

function patchRoadmapOverview(roadmap, rollupByMilestone) {
  const lines = roadmap.split("\n")
  const headerIdx = lines.findIndex((l) => l.startsWith("| # | Milestone | Target | PRD | Status |"))
  if (headerIdx < 0) return roadmap

  const milestoneMap = {
    1: "M1",
    2: "M2",
    3: "M3",
    4: "M4",
    5: "M5",
    6: "M6"
  }

  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith("|")) break
    const cols = line.split("|").map((c) => c.trim())
    const num = Number(cols[1])
    const key = milestoneMap[num]
    if (!key || !rollupByMilestone[key]) continue

    const rollup = rollupByMilestone[key]
    let statusCell = ROADMAP_STATUS_BY_ROLLUP[rollup] ?? "⬜ Not started"
    if (rollup === "done" && num === 1) statusCell = "✅ Done (2026-05-26)"
    if (rollup === "done" && num === 2) statusCell = "✅ Done (2026-06-23)"
    if (rollup === "done" && num === 4) statusCell = "✅ Done (revised per-lembar, 2026-06-29)"

    const parts = line.split("|")
    parts[5] = ` ${statusCell} `
    lines[i] = parts.join("|")
  }
  return lines.join("\n")
}

function rebuildIssueTable(issueParse, rows) {
  const newLines = [...issueParse.lines]
  for (const row of rows) {
    newLines[row.lineIdx] =
      `| ${row.milestone} | ${row.epic} | ${row.issue} | ${row.title} | ${row.status} | ${row.code_signal} | ${row.closed_by} |`
  }
  return newLines.join("\n")
}

async function codeSignalExists(signal) {
  if (!signal || signal === "—" || signal.startsWith("superseded")) return true
  const path = join(ROOT, signal.split(/\s/)[0])
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function epicRollupComment(epicNum, childRows) {
  const closed = childRows.filter((r) => r.status === "closed").length
  const total = childRows.length
  const pct = total > 0 ? Math.round((closed / total) * 100) : 0
  return `<!-- sync-github-progress -->
**Progress sync** (auto-updated): ${closed}/${total} child tasks closed (${pct}%).

| Status | Count |
|--------|-------|
| closed | ${childRows.filter((r) => r.status === "closed").length} |
| partial | ${childRows.filter((r) => r.status === "partial").length} |
| open | ${childRows.filter((r) => r.status === "open").length} |
`
}

function updateEpicComment(epicNum, body) {
  if (dryRun) {
    console.log(`[dry-run] Would update epic #${epicNum} progress comment`)
    return false
  }
  const comments = ghJson(`api repos/{owner}/{repo}/issues/${epicNum}/comments --jq '.'`)
  const existing = comments.find((c) => c.body?.includes("<!-- sync-github-progress -->"))
  if (existing) {
    if (existing.body === body) return false
    execSync(
      `gh api repos/{owner}/{repo}/issues/comments/${existing.id} -X PATCH -f body=${JSON.stringify(body)}`,
      { cwd: ROOT }
    )
    return true
  }
  execSync(
    `gh api repos/{owner}/{repo}/issues/${epicNum}/comments -f body=${JSON.stringify(body)}`,
    { cwd: ROOT }
  )
  return true
}

async function main() {
  let indexMd = await readFile(INDEX_PATH, "utf8")
  let roadmapMd = await readFile(ROADMAP_PATH, "utf8")
  const originalIndex = indexMd
  const originalRoadmap = roadmapMd

  if (prNumber) {
    try {
      const pr = ghJson(`pr view ${prNumber} --json body,title`)
      console.log(`[sync] Processing merged PR #${prNumber}: ${pr.title}`)
      const closed = [...pr.body.matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map(
        (m) => Number(m[1])
      )
      if (closed.length > 0) console.log(`[sync] PR closes issues: ${closed.join(", ")}`)
    } catch (e) {
      console.warn(`[sync] Could not read PR #${prNumber}:`, e.message)
    }
  }

  const issueParse = parseIssueRows(indexMd)

  const issueNumbers = issueParse.rows
    .map((r) => issueNumberFromCell(r.issue))
    .filter((n) => n !== null)

  const ghStates = fetchGhStates(issueNumbers)

  for (const row of issueParse.rows) {
    const num = issueNumberFromCell(row.issue)
    if (num === null) continue
    const ghState = ghStates.get(num)
    if (!ghState) continue
    if (ghState === "closed" && row.status === "open") {
      row.status = "closed"
    }
  }

  if (verify) {
    const mismatches = []
    for (const row of issueParse.rows) {
      if (row.status !== "open" || !row.code_signal || row.code_signal === "—") continue
      const exists = await codeSignalExists(row.code_signal)
      if (exists) {
        mismatches.push({ issue: row.issue, title: row.title, signal: row.code_signal })
      }
    }
    if (mismatches.length > 0) {
      console.log("[verify] Open issues with existing code_signal (consider closing):")
      for (const m of mismatches) {
        console.log(`  ${m.issue} ${m.title} → ${m.signal}`)
      }
    }
  }

  indexMd = rebuildIssueTable(issueParse, issueParse.rows)
  const updatedOverview = parseOverviewRows(indexMd)
  indexMd = rebuildOverviewTable(updatedOverview, issueParse.rows)

  const rollupByMilestone = {}
  for (const m of ["M1", "M2", "M3", "M4", "M5", "M6"]) {
    rollupByMilestone[m] = rollupForMilestone(issueParse.rows, m)
  }

  roadmapMd = patchRoadmapOverview(roadmapMd, rollupByMilestone)

  let changed = indexMd !== originalIndex || roadmapMd !== originalRoadmap

  if (changed) {
    if (dryRun) {
      console.log("[dry-run] Would update ISSUE_INDEX.md and ROADMAP.md")
    } else {
      await writeFile(INDEX_PATH, indexMd)
      await writeFile(ROADMAP_PATH, roadmapMd)
      console.log("[sync] Updated ISSUE_INDEX.md and ROADMAP.md")
    }
  } else {
    console.log("[sync] No doc changes needed")
  }

  for (const epicNum of EPIC_ISSUES) {
    const epicKey = `#${epicNum}`
    const children = issueParse.rows.filter((r) => r.epic === epicKey && r.issue !== epicKey)
    if (children.length === 0) continue
    const body = epicRollupComment(epicNum, children)
    const commentChanged = updateEpicComment(epicNum, body)
    if (commentChanged) {
      changed = true
      console.log(`[sync] Updated epic #${epicNum} progress comment`)
    }
  }

  if (dryRun) process.exit(0)
  process.exit(changed ? 0 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
