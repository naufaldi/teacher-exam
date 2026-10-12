import { assertAiProviderReady } from "../production-ai-config"
import { DEFAULT_OPENAI_MODEL } from "./constants"

export const AI_CREDIT_MESSAGE = "Kredit penyedia AI habis. Isi saldo, lalu coba generate lagi."
export const AI_TIMEOUT_MESSAGE = "Penyedia AI tidak menjawab tepat waktu. Coba lagi sebentar."
export const AI_WRONG_MODEL_MESSAGE = "Model yang menjawab bukan gpt-6-luna."

export type ProviderHttpResult =
  | { readonly ok: true; readonly model: string }
  | { readonly ok: false; readonly message: string }

export function explainProviderHttp(input: {
  readonly status: number
  readonly body: string
  readonly expectedModel: string
  readonly timedOut: boolean
}): ProviderHttpResult {
  if (input.timedOut || /timeout|timed out|aborted/i.test(input.body)) {
    return { ok: false, message: AI_TIMEOUT_MESSAGE }
  }
  if (input.status === 400 && /credit|billing|insufficient[_\s-]?quota/i.test(input.body)) {
    return { ok: false, message: AI_CREDIT_MESSAGE }
  }
  if (input.status !== 200) {
    return { ok: false, message: `Penyedia AI menolak generate (HTTP ${input.status}).` }
  }
  let model: string
  try {
    const parsed = JSON.parse(input.body) as { model?: unknown }
    model = typeof parsed.model === "string" ? parsed.model : ""
  } catch {
    return { ok: false, message: "Penyedia AI mengembalikan jawaban yang tidak bisa dibaca." }
  }
  if (model !== input.expectedModel) {
    return { ok: false, message: AI_WRONG_MODEL_MESSAGE }
  }
  return { ok: true, model }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.name === "AbortError" || /timeout|timed out|aborted/i.test(error.message)
}

export async function probeOpenAiGenerate(
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch = fetch
): Promise<ProviderHttpResult> {
  let selection: ReturnType<typeof assertAiProviderReady>
  try {
    selection = assertAiProviderReady(env)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, message }
  }
  if (selection.provider !== "openai" || selection.baseUrl === undefined) {
    return {
      ok: false,
      message: `AI_PROVIDER is ${selection.provider}. Production generate expects openai.`
    }
  }
  const apiKey = env["OPENAI_API_KEY"]?.trim()
  if (!apiKey) {
    return {
      ok: false,
      message: "OPENAI_API_KEY is required when AI_PROVIDER=openai. Refusing to fall back to Anthropic."
    }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetchImpl(`${selection.baseUrl.replace(/\/$/, "")}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selection.model,
        input: "ping",
        max_output_tokens: 16
      }),
      signal: controller.signal
    })
    const body = await response.text()
    return explainProviderHttp({
      status: response.status,
      body,
      expectedModel: selection.model || DEFAULT_OPENAI_MODEL,
      timedOut: false
    })
  } catch (error) {
    return explainProviderHttp({
      status: 0,
      body: error instanceof Error ? error.message : "",
      expectedModel: selection.model,
      timedOut: isTimeoutError(error)
    })
  } finally {
    clearTimeout(timer)
  }
}
