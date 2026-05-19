/**
 * Smoke-generate one exam per PRD v3 Phase 1 combo (4 total).
 * Usage: node --env-file-if-exists=../../.env --import tsx/esm scripts/qa-phase1-smoke.ts
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const API = process.env['API_URL'] ?? 'http://localhost:3001'

const COMBOS = [
  { subject: 'ipas', grade: 5, topic: 'Cahaya dan Bunyi' },
  { subject: 'ipas', grade: 6, topic: 'Tubuh Manusia dan Kesehatan' },
  { subject: 'bahasa_inggris', grade: 5, topic: 'Daily Activities' },
  { subject: 'bahasa_inggris', grade: 6, topic: 'Past Experiences' },
] as const

function englishRatio(text: string): number {
  const words = text.match(/[A-Za-z]+/g) ?? []
  if (words.length === 0) return 0
  const ascii = words.filter((w) => /^[A-Za-z]+$/.test(w)).length
  return ascii / words.length
}

async function main() {
  const outDir = join(process.cwd(), '../../docs/qa/samples')
  await mkdir(outDir, { recursive: true })

  const results: unknown[] = []

  for (const combo of COMBOS) {
    const body = {
      subject: combo.subject,
      grade: combo.grade,
      topics: [combo.topic],
      difficulty: 'sedang',
      reviewMode: 'fast',
      examType: 'latihan',
      totalSoal: 5,
    }

    const res = await fetch(`${API}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: process.env['QA_SESSION_COOKIE'] ?? '' },
      body: JSON.stringify(body),
    })

    const payload = (await res.json()) as { questions?: Array<{ text?: string; option_a?: string }>; error?: string }
    const stems = (payload.questions ?? []).map((q) => q.text ?? '').join(' ')
    const options = (payload.questions ?? []).map((q) => q.option_a ?? '').join(' ')
    const enStemRatio = englishRatio(stems)
    const enOptRatio = englishRatio(options)

    const row = {
      combo,
      status: res.status,
      questionCount: payload.questions?.length ?? 0,
      enStemRatio: combo.subject === 'bahasa_inggris' ? enStemRatio : null,
      enOptRatio: combo.subject === 'bahasa_inggris' ? enOptRatio : null,
      error: payload.error ?? null,
    }
    results.push(row)
    console.log(JSON.stringify(row))
  }

  await writeFile(join(outDir, `smoke-${Date.now()}.json`), JSON.stringify(results, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
