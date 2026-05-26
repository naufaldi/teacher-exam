/**
 * PRD v3 Phase 1 live QA sampling — 50 questions per (subject × grade).
 *
 * Usage:
 *   pnpm --filter @teacher-exam/api qa:phase1
 *   pnpm --filter @teacher-exam/api qa:phase1 -- --count 5   # smoke subset
 *
 * Requires: DATABASE_URL, SESSION_SECRET, AI credentials, DEV_AUTH_ENABLED=true
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { ExamSubject, ExamWithQuestions, Question } from '@teacher-exam/shared'
import { validatePhase1Question } from '../src/lib/phase1-qa-validator.js'

const API = process.env['API_URL'] ?? 'http://localhost:3000'
const APP_URL = process.env['APP_URL'] ?? 'http://localhost:5173'

type Combo = {
  label: string
  subject: Extract<ExamSubject, 'ipas' | 'bahasa_inggris'>
  grade: 5 | 6
  topics: readonly string[]
}

const COMBOS: readonly Combo[] = [
  {
    label: 'IPAS K5',
    subject: 'ipas',
    grade: 5,
    topics: ['Cahaya dan Bunyi', 'Ekosistem dan Rantai Makanan', 'Magnet dan Listrik Sederhana', 'Siklus Air dan Perubahan Bumi', 'Sumber Daya Alam Indonesia'],
  },
  {
    label: 'IPAS K6',
    subject: 'ipas',
    grade: 6,
    topics: ['Tubuh Manusia dan Kesehatan', 'Energi dan Perubahannya', 'Bumi, Bulan, Matahari, dan Tata Surya', 'Cahaya dan Bunyi', 'Ekosistem dan Rantai Makanan'],
  },
  {
    label: 'B.Inggris K5',
    subject: 'bahasa_inggris',
    grade: 5,
    topics: ['Daily Activities', 'At School', 'Food and Drinks', 'My House and My Room', 'Animals Around Us'],
  },
  {
    label: 'B.Inggris K6',
    subject: 'bahasa_inggris',
    grade: 6,
    topics: ['Past Experiences', 'Directions and Public Places', 'Stories and Moral Lessons', 'Health and Safety', 'Future Plans and Invitations'],
  },
] as const

type SampleRow = {
  number: number
  pass: boolean
  reason: string | null
  topic: string | null
}

type ComboResult = {
  combo: Combo
  httpStatus: number
  questionCount: number
  pass: number
  fail: number
  passPct: number
  samples: SampleRow[]
  error: string | null
}

function parseCount(argv: string[]): number {
  const index = argv.indexOf('--count')
  if (index === -1) return 50
  return Number(argv[index + 1] ?? 50)
}

function parseOnlyLabels(argv: string[]): Set<string> | null {
  const index = argv.indexOf('--only')
  if (index === -1) return null
  const raw = argv[index + 1] ?? ''
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
}

async function devLoginCookie(): Promise<string> {
  const existing = process.env['QA_SESSION_COOKIE']
  if (existing?.trim()) return existing.trim()

  const res = await fetch(`${API}/api/dev/login`, {
    method: 'POST',
    headers: { Origin: APP_URL, 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Dev login failed (${res.status}). Set DEV_AUTH_ENABLED=true and seed dev guru.`)
  }

  const setCookie = res.headers.getSetCookie?.() ?? []
  const cookie = setCookie.map((c) => c.split(';')[0]).filter(Boolean).join('; ')
  if (!cookie) {
    throw new Error('Dev login succeeded but no session cookie returned')
  }
  return cookie
}

function validateQuestions(questions: readonly Question[], subject: Combo['subject']): SampleRow[] {
  return questions.map((q) => {
    const result = validatePhase1Question(q, subject)
    return {
      number: q.number,
      pass: result.pass,
      reason: result.reason,
      topic: q.topic,
    }
  })
}

async function fetchGenerate(body: object, cookie: string): Promise<Response> {
  const maxAttempts = 8
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${API}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        Origin: APP_URL,
      },
      body: JSON.stringify(body),
    })

    if (res.status !== 429) return res

    const payload = (await res.json().catch(() => ({}))) as { retryAfterSec?: number }
    const waitSec = payload.retryAfterSec ?? 10
    console.log(`[qa:phase1] rate limited — waiting ${waitSec}s (attempt ${attempt}/${maxAttempts})`)
    await new Promise((resolve) => setTimeout(resolve, waitSec * 1000))
  }

  throw new Error('Rate limit retries exhausted')
}

async function runCombo(combo: Combo, count: number, cookie: string): Promise<ComboResult> {
  const body = {
    subject: combo.subject,
    grade: combo.grade,
    topics: [...combo.topics],
    difficulty: 'sedang',
    reviewMode: 'fast',
    examType: 'latihan',
    totalSoal: count,
  }

  console.log(`[qa:phase1] generating ${count} for ${combo.label}...`)
  const started = Date.now()

  const res = await fetchGenerate(body, cookie)

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`[qa:phase1] ${combo.label} HTTP ${res.status} in ${elapsed}s`)

  if (!res.ok) {
    const errText = await res.text()
    return {
      combo,
      httpStatus: res.status,
      questionCount: 0,
      pass: 0,
      fail: count,
      passPct: 0,
      samples: [],
      error: errText.slice(0, 500),
    }
  }

  const payload = (await res.json()) as ExamWithQuestions
  const questions = payload.questions ?? []
  const samples = validateQuestions(questions, combo.subject)
  const pass = samples.filter((s) => s.pass).length
  const fail = samples.length - pass
  const passPct = samples.length === 0 ? 0 : Math.round((pass / samples.length) * 1000) / 10

  return {
    combo,
    httpStatus: res.status,
    questionCount: questions.length,
    pass,
    fail,
    passPct,
    samples,
    error: null,
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const count = parseCount(argv)
  const only = parseOnlyLabels(argv)
  const selected = only
    ? COMBOS.filter((c) => only.has(c.label))
    : COMBOS

  if (selected.length === 0) {
    throw new Error('No combos matched --only filter')
  }

  const outDir = join(process.cwd(), '../../docs/qa/reports')
  await mkdir(outDir, { recursive: true })

  const cookie = await devLoginCookie()
  const results: ComboResult[] = []

  for (const combo of selected) {
    results.push(await runCombo(combo, count, cookie))
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  const slug = `phase1-live-${count}`
  const jsonPath = join(outDir, `${slug}.json`)
  const mdPath = join(outDir, `${slug}.md`)
  const generatedAt = new Date().toISOString()

  await writeFile(jsonPath, JSON.stringify({ generatedAt, count, results }, null, 2))

  const lines = [
    `# M1 Phase 1 Live QA Report`,
    '',
    `- Generated: ${generatedAt}`,
    `- Samples per combo: ${count}`,
    `- JSON: ${basename(jsonPath)}`,
    '',
    '| Combo | Pass | Fail | Pass % | Target |',
    '|-------|------|------|--------|--------|',
  ]

  let allPass = true
  for (const r of results) {
    const target = r.passPct >= 90 ? 'OK' : 'FAIL'
    if (r.passPct < 90) allPass = false
    lines.push(`| ${r.combo.label} | ${r.pass} | ${r.fail} | ${r.passPct}% | ${target} |`)
  }

  lines.push('')
  if (allPass && count >= 50) {
    lines.push('All four combos met the ≥90% automated pass threshold.')
  } else if (allPass) {
    lines.push(`Smoke run (${count}/combo) passed; re-run with default count=50 for sign-off.`)
  } else {
    lines.push('One or more combos missed ≥90%. Review failure reasons in JSON before closing B4.')
  }

  lines.push('')
  lines.push('Automated checks: schema-safe MCQ, distinct options, topic present, language ratio, no generation stubs.')

  await writeFile(mdPath, lines.join('\n') + '\n')

  console.log(`[qa:phase1] wrote ${jsonPath}`)
  console.log(`[qa:phase1] wrote ${mdPath}`)

  for (const r of results) {
    console.log(`[qa:phase1] ${r.combo.label}: ${r.pass}/${r.questionCount} pass (${r.passPct}%)`)
    if (r.error) console.error(`[qa:phase1] ${r.combo.label} error: ${r.error}`)
  }

  if (!allPass) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
