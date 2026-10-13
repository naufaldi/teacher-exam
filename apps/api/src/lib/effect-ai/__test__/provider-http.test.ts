import { describe, expect, it, vi } from "vitest"
import { AI_CREDIT_MESSAGE, AI_TIMEOUT_MESSAGE, AI_WRONG_MODEL_MESSAGE, probeOpenAiGenerate } from "../provider-http"

const env = {
  AI_PROVIDER: "openai",
  OPENAI_API_KEY: "test-key",
  OPENAI_BASE_URL: "https://api-us-ca.umodelverse.ai/v1"
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status })
}

describe("probeOpenAiGenerate", () => {
  it("posts gpt-6-luna to the configured base URL and accepts that model", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { model: "gpt-6-luna" }))
    const result = await probeOpenAiGenerate(env, fetchImpl)
    expect(result).toEqual({ ok: true, model: "gpt-6-luna" })
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api-us-ca.umodelverse.ai/v1/responses")
    const init = fetchImpl.mock.calls[0]?.[1]
    expect(JSON.parse(String(init?.body)).model).toBe("gpt-6-luna")
  })

  it("returns a credit message on HTTP 400", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(400, { error: { message: "Your credit balance is too low" } }))
    const result = await probeOpenAiGenerate(env, fetchImpl)
    expect(result).toEqual({ ok: false, message: AI_CREDIT_MESSAGE })
  })

  it("returns a timeout message when the provider aborts", async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error("The operation was aborted")
      error.name = "AbortError"
      throw error
    })
    const result = await probeOpenAiGenerate(env, fetchImpl)
    expect(result).toEqual({ ok: false, message: AI_TIMEOUT_MESSAGE })
  })

  it("returns a wrong-model message when the provider answers with another model", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { model: "gpt-5.4-mini" }))
    const result = await probeOpenAiGenerate(env, fetchImpl)
    expect(result).toEqual({ ok: false, message: AI_WRONG_MODEL_MESSAGE })
  })
})
