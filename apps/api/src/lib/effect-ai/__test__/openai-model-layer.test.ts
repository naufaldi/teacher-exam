import { LanguageModel } from "@effect/ai"
import { Effect, Option, Schema, Stream } from "effect"
import { afterEach, describe, expect, it } from "vitest"
import { buildOpenAiModelLayers } from "../layers"
import { buildPrompt } from "../prompt"

const openAiConfig = {
  provider: "openai" as const,
  apiKey: "sk-test",
  apiUrl: "https://proxy.example/v1",
  model: "gpt-6-luna",
  pdfModel: "gpt-6-luna",
  discussionModel: "gpt-6-luna",
  maxTokens: 100,
  discussionMaxTokens: 50,
  validationMaxTokens: 40
}

function responseBody(text: string) {
  return {
    id: "resp_1",
    model: "gpt-6-luna",
    created_at: 1,
    status: "completed",
    output: [
      {
        id: "msg_1",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [
          {
            type: "output_text",
            text,
            annotations: []
          }
        ]
      }
    ],
    usage: {
      input_tokens: 3,
      output_tokens: 2,
      total_tokens: 5
    }
  }
}

describe("buildOpenAiModelLayers", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("posts a Responses request and returns assistant text", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      calls.push({ url: String(input), body })
      return new Response(JSON.stringify(responseBody("hello guru")), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    }) as typeof fetch

    const layers = buildOpenAiModelLayers(openAiConfig)
    const response = await Effect.runPromise(
      LanguageModel.generateText({
        prompt: buildPrompt({ system: "sys", user: "user text" })
      }).pipe(Effect.provide(layers.text))
    )

    expect(response.text).toBe("hello guru")
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://proxy.example/v1/responses")
    expect(calls[0]?.body["model"]).toBe("gpt-6-luna")
    expect(calls[0]?.body["max_output_tokens"]).toBe(100)
    expect(JSON.stringify(calls[0]?.body)).toContain("user text")
    expect(JSON.stringify(calls[0]?.body)).toContain("sys")
  })

  it("sends PDF bytes as an OpenAI input file", async () => {
    const calls: Array<Record<string, unknown>> = []
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(JSON.stringify(responseBody("from pdf")), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    }) as typeof fetch

    const layers = buildOpenAiModelLayers(openAiConfig)
    const pdfBytes = Buffer.from("%PDF-1.4 fake")
    await Effect.runPromise(
      LanguageModel.generateText({
        prompt: buildPrompt({ system: "sys", user: "read this", pdfBytes })
      }).pipe(Effect.provide(layers.pdf))
    )

    const serialized = JSON.stringify(calls[0])
    expect(serialized).toContain("input_file")
    expect(serialized).toContain("materi.pdf")
    expect(serialized).toContain("data:application/pdf;base64,")
  })

  it("asks the Responses API for JSON that matches the object schema", async () => {
    const calls: Array<Record<string, unknown>> = []
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(JSON.stringify(responseBody("{\"title\":\"Ujian\"}")), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    }) as typeof fetch

    const layers = buildOpenAiModelLayers(openAiConfig)
    const TitleSchema = Schema.Struct({ title: Schema.String })
    const response = await Effect.runPromise(
      LanguageModel.generateObject({
        prompt: buildPrompt({ system: "sys", user: "judul" }),
        schema: TitleSchema,
        objectName: "title"
      }).pipe(Effect.provide(layers.text))
    )

    expect(response.value).toEqual({ title: "Ujian" })
    const serialized = JSON.stringify(calls[0])
    expect(serialized).toContain("json_schema")
    expect(serialized).toContain("title")
  })

  it("streams text deltas from the Responses SSE events", async () => {
    const calls: Array<Record<string, unknown>> = []
    const completed = responseBody("")
    const sse = [
      "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"delta\":\"hel\"}",
      "",
      "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"delta\":\"lo\"}",
      "",
      `data: ${JSON.stringify({ type: "response.completed", response: completed })}`,
      "",
      ""
    ].join("\n")
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(sse, {
        status: 200,
        headers: { "content-type": "text/event-stream" }
      })
    }) as typeof fetch

    const layers = buildOpenAiModelLayers(openAiConfig)
    const chunks = await Effect.runPromise(
      LanguageModel.streamText({
        prompt: buildPrompt({ system: "sys", user: "stream me" })
      }).pipe(
        Stream.filterMap((part) => part.type === "text-delta" ? Option.some(part.delta) : Option.none()),
        Stream.runCollect,
        Effect.provide(layers.discussion)
      )
    )

    expect(Array.from(chunks).join("")).toBe("hello")
    expect(calls[0]?.["stream"]).toBe(true)
    expect(calls[0]?.["max_output_tokens"]).toBe(50)
  })
})
