import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { Context, Effect, Layer } from "effect"
import { DEFAULT_OPENAI_BASE_URL } from "../../lib/effect-ai/constants"
import { decodeGptImagePayload, gptImageGenerationBody, resolveGptImageModelId } from "../../lib/gpt-image"
import { ApiAiError } from "../errors/http"

export const TEST_GPT_IMAGE_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

export class SoalImageModel extends Context.Tag("SoalImageModel")<SoalImageModel, {
  readonly generatePng: (prompt: string) => Effect.Effect<{ readonly dataBase64: string }, ApiAiError>
}>() {}

export function generateGptImagePng(prompt: string): Effect.Effect<
  { readonly dataBase64: string },
  ApiAiError,
  HttpClient.HttpClient
> {
  return Effect.gen(function*() {
    const apiKey = process.env["OPENAI_API_KEY"]
    if (apiKey === undefined || apiKey === "") {
      return yield* Effect.fail(
        new ApiAiError({ error: "OPENAI_API_KEY is required to draw a model image", code: "AI_ERROR" })
      )
    }
    const baseUrl = (process.env["OPENAI_BASE_URL"] ?? DEFAULT_OPENAI_BASE_URL).replace(/\/$/, "")
    const model = resolveGptImageModelId(process.env)
    const http = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post(`${baseUrl}/images/generations`).pipe(
        HttpClientRequest.setHeader("Authorization", `Bearer ${apiKey}`)
      ),
      gptImageGenerationBody(prompt, model)
    ).pipe(Effect.mapError(() => new ApiAiError({ error: "Image model request failed", code: "AI_ERROR" })))
    const response = yield* http.execute(request).pipe(
      Effect.mapError(() => new ApiAiError({ error: "Image model request failed", code: "AI_ERROR" }))
    )
    if (response.status < 200 || response.status >= 300) {
      return yield* Effect.fail(
        new ApiAiError({ error: `Image model returned ${response.status}`, code: "AI_ERROR" })
      )
    }
    const json = yield* response.json.pipe(
      Effect.mapError(() => new ApiAiError({ error: "Image model returned invalid JSON", code: "AI_ERROR" }))
    )
    const decoded = decodeGptImagePayload(json)
    if (decoded === null) {
      return yield* Effect.fail(
        new ApiAiError({ error: "Image model returned no image", code: "AI_ERROR" })
      )
    }
    return decoded
  })
}

export const SoalImageModelLive = Layer.succeed(SoalImageModel, {
  generatePng: (prompt: string) => generateGptImagePng(prompt).pipe(Effect.provide(FetchHttpClient.layer))
})

export const TestSoalImageModelLive = Layer.succeed(SoalImageModel, {
  generatePng: () => Effect.succeed({ dataBase64: TEST_GPT_IMAGE_PNG })
})
