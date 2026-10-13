import { GPT_IMAGE_MODEL_ID } from "@teacher-exam/shared"

export function resolveGptImageModelId(env: NodeJS.ProcessEnv): string {
  const override = env["OPENAI_IMAGE_MODEL"]
  if (override !== undefined && override.trim() !== "") return override.trim()
  return GPT_IMAGE_MODEL_ID
}

export function gptImageGenerationBody(prompt: string, model: string): {
  model: string
  prompt: string
  n: number
  size: "1024x1024"
  quality: "low"
  output_format: "png"
} {
  return {
    model,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "low",
    output_format: "png"
  }
}

export function decodeGptImagePayload(body: unknown): { dataBase64: string } | null {
  if (body === null || typeof body !== "object") return null
  const data = (body as { data?: unknown }).data
  if (!Array.isArray(data)) return null
  const first = data[0]
  if (first === null || typeof first !== "object") return null
  const b64 = (first as { b64_json?: unknown }).b64_json
  if (typeof b64 !== "string" || b64.length < 8) return null
  return { dataBase64: b64 }
}

export function stimulusSvgPrompt(questionText: string): string {
  const stem = questionText.replace(/\s+/g, " ").trim().slice(0, 500)
  return [
    "Draw one simple illustration for this Indonesian primary-school exam stimulus.",
    "Return only an <svg> element with a few shapes. No markdown, no script, no answer letter, no caption that states the answer.",
    `Question: ${stem}`
  ].join("\n")
}
