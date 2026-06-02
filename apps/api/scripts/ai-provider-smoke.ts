/**
 * Live per-provider AI smoke — generate, validate-curriculum, regenerate (1 question each).
 *
 * Usage:
 *   pnpm --filter @teacher-exam/api qa:live-ai
 *   pnpm --filter @teacher-exam/api qa:live-ai -- --provider openai
 *   pnpm --filter @teacher-exam/api qa:live-ai -- --dry-run
 *   pnpm --filter @teacher-exam/api qa:live-ai -- --strict
 *
 * Requires (per provider): see .env.example AI_* section.
 * Skips providers with missing keys unless --strict (exit 1).
 */
import type { ExamWithQuestions } from "@teacher-exam/shared"

const API = process.env["API_URL"] ?? "http://localhost:3000"
const APP_URL = process.env["APP_URL"] ?? "http://localhost:5173"

export const PROVIDERS = ["anthropic", "minimax", "openai"] as const
export type SmokeProvider = (typeof PROVIDERS)[number]

export function parseSmokeArgs(argv: ReadonlyArray<string>): {
  dryRun: boolean
  strict: boolean
  provider: SmokeProvider | null
} {
  let dryRun = false
  let strict = false
  let provider: SmokeProvider | null = null
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      dryRun = true
    } else if (arg === "--strict") {
      strict = true
    } else if (arg === "--provider") {
      const value = argv[i + 1]
      if (value === "anthropic" || value === "minimax" || value === "openai") {
        provider = value
      }
      i += 1
    }
  }
  return { dryRun, strict, provider }
}

export function hasProviderKeys(provider: SmokeProvider): boolean {
  if (provider === "anthropic") {
    const key = process.env["ANTHROPIC_API_KEY"]
    return Boolean(key && !key.includes("REPLACE_ME") && !key.includes("your-api-key"))
  }
  if (provider === "minimax") {
    const key = process.env["MINIMAX_API_KEY"]
    return Boolean(key && key.length > 0)
  }
  const key = process.env["OPENAI_API_KEY"]
  return Boolean(key && key.length > 0)
}

export function resolveProviderMatrix(selected: SmokeProvider | null): ReadonlyArray<SmokeProvider> {
  if (selected !== null) {
    return [selected]
  }
  return PROVIDERS
}

export function buildGenerateBody() {
  return {
    subject: "ipas",
    grade: 5,
    topics: ["Cahaya dan Bunyi"],
    difficulty: "sedang",
    reviewMode: "fast",
    examType: "latihan",
    totalSoal: 2
  }
}

async function devLoginCookie(): Promise<string> {
  const existing = process.env["QA_SESSION_COOKIE"]
  if (existing?.trim()) {
    return existing.trim()
  }
  const res = await fetch(`${API}/api/dev/login`, {
    method: "POST",
    headers: { Origin: APP_URL, "Content-Type": "application/json" }
  })
  if (!res.ok) {
    throw new Error(`Dev login failed (${res.status}). Enable DEV_AUTH_ENABLED and seed dev guru.`)
  }
  const setCookie = res.headers.getSetCookie?.() ?? []
  const cookie = setCookie.map((entry) => entry.split(";")[0]).filter(Boolean).join("; ")
  if (!cookie) {
    throw new Error("Dev login succeeded but no session cookie returned")
  }
  return cookie
}

async function runProviderSmoke(provider: SmokeProvider, cookie: string): Promise<void> {
  process.env["AI_PROVIDER"] = provider
  console.log(`[qa:live-ai] provider=${provider} generate...`)
  const generateRes = await fetch(`${API}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: APP_URL },
    body: JSON.stringify(buildGenerateBody())
  })
  if (!generateRes.ok) {
    throw new Error(`generate failed (${generateRes.status}): ${await generateRes.text()}`)
  }
  const exam = (await generateRes.json()) as ExamWithQuestions
  const examId = exam.id
  const questionId = exam.questions[0]?.id
  if (!questionId) {
    throw new Error("generate returned no questions")
  }

  console.log(`[qa:live-ai] provider=${provider} validate-curriculum...`)
  const validateRes = await fetch(`${API}/api/exams/${examId}/validate-curriculum`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: APP_URL, "Content-Length": "0" }
  })
  if (!validateRes.ok) {
    throw new Error(`validate-curriculum failed (${validateRes.status}): ${await validateRes.text()}`)
  }

  console.log(`[qa:live-ai] provider=${provider} regenerate...`)
  const regenerateRes = await fetch(`${API}/api/exams/${examId}/questions/${questionId}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: APP_URL },
    body: JSON.stringify({ feedback: "Buat lebih singkat" })
  })
  if (!regenerateRes.ok) {
    throw new Error(`regenerate failed (${regenerateRes.status}): ${await regenerateRes.text()}`)
  }

  console.log(`[qa:live-ai] provider=${provider} OK (exam ${examId})`)
}

async function main() {
  const { dryRun, provider, strict } = parseSmokeArgs(process.argv.slice(2))
  const matrix = resolveProviderMatrix(provider)
  const runnable = matrix.filter((entry) => hasProviderKeys(entry))
  const skipped = matrix.filter((entry) => !hasProviderKeys(entry))

  if (skipped.length > 0) {
    console.log(`[qa:live-ai] skipping (missing keys): ${skipped.join(", ")}`)
  }

  if (dryRun) {
    console.log(`[qa:live-ai] dry-run OK — would run: ${runnable.join(", ") || "none"}`)
    if (strict && skipped.length > 0) {
      process.exitCode = 1
    }
    return
  }

  if (runnable.length === 0) {
    const message = "[qa:live-ai] no providers with keys configured"
    console.log(message)
    if (strict) {
      process.exitCode = 1
    }
    return
  }

  const cookie = await devLoginCookie()
  for (const entry of runnable) {
    await runProviderSmoke(entry, cookie)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[qa:live-ai] failed:", err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
}
