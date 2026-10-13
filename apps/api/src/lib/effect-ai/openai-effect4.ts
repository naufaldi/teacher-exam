import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"

/**
 * `@effect/ai-openai` 4.0.2 runs on Effect 4. The API stays on Effect 3.21.2,
 * so this module loads the Effect 4 copy nested under that package.
 */
const nodeRequire = createRequire(import.meta.url)
const effect4Require = createRequire(nodeRequire.resolve("@effect/ai-openai/package.json"))

export interface OpenAiFilePart {
  readonly mediaType: string
  readonly fileName?: string
  readonly data: Uint8Array | string | URL
}

export interface OpenAiJsonSchemaRequest {
  readonly name: string
  readonly schema: Record<string, unknown>
}

export interface OpenAiCompletionRequest {
  readonly apiKey: string
  readonly apiUrl?: string
  readonly model: string
  readonly maxOutputTokens: number
  readonly system: string
  readonly userText: string
  readonly files: ReadonlyArray<OpenAiFilePart>
  readonly jsonSchema?: OpenAiJsonSchemaRequest
}

export interface OpenAiFinishPart {
  readonly type: "finish"
  readonly reason: "stop" | "length" | "unknown"
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
    readonly totalTokens: number
  }
}

export interface OpenAiTextPart {
  readonly type: "text"
  readonly text: string
}

export type OpenAiResponsePart = OpenAiTextPart | OpenAiFinishPart

export interface OpenAiStreamPart {
  readonly type: "text-start" | "text-delta" | "text-end"
  readonly id: string
  readonly delta?: string
}

interface OpenAiService {
  readonly createResponse: (payload: Record<string, unknown>) => unknown
  readonly createResponseStream: (payload: Record<string, unknown>) => unknown
}

interface Effect4Module {
  // Effect 4 modules are loaded dynamically so they stay off the Effect 3 type graph.
  readonly Effect: {
    readonly flatMap: (self: unknown, f: (value: unknown) => unknown) => unknown
    readonly map: (self: unknown, f: (value: unknown) => unknown) => unknown
    readonly provide: (
      self: unknown,
      layer: unknown,
      options?: { readonly local?: boolean }
    ) => unknown
    readonly runPromise: (self: unknown) => Promise<unknown>
  }
  readonly Layer: {
    readonly provide: (self: unknown, that: unknown) => unknown
    readonly succeed: (tag: unknown, value: unknown) => unknown
  }
  readonly Redacted: {
    readonly make: (value: string) => unknown
  }
  readonly Stream: {
    readonly runCollect: (self: unknown) => unknown
  }
  readonly FetchHttpClient: {
    readonly Fetch: unknown
    readonly layer: unknown
  }
  readonly OpenAiClient: {
    readonly OpenAiClient: {
      readonly use: (use: (client: OpenAiService) => unknown) => unknown
    }
    readonly layer: (options: { readonly apiKey: unknown; readonly apiUrl?: string }) => unknown
  }
}

let runtimePromise: Promise<Effect4Module> | undefined

function importEffect4(specifier: string): Promise<Record<string, unknown>> {
  return import(pathToFileURL(effect4Require.resolve(specifier)).href) as Promise<Record<string, unknown>>
}

function loadRuntime(): Promise<Effect4Module> {
  if (runtimePromise === undefined) {
    runtimePromise = Promise.all([
      importEffect4("effect/Effect"),
      importEffect4("effect/Layer"),
      importEffect4("effect/Redacted"),
      importEffect4("effect/Stream"),
      importEffect4("effect/http/FetchHttpClient"),
      importEffect4("@effect/ai-openai/OpenAiClient")
    ]).then(([Effect, Layer, Redacted, Stream, FetchHttpClient, OpenAiClient]) => ({
      Effect: Effect as Effect4Module["Effect"],
      Layer: Layer as Effect4Module["Layer"],
      Redacted: Redacted as Effect4Module["Redacted"],
      Stream: Stream as Effect4Module["Stream"],
      FetchHttpClient: FetchHttpClient as Effect4Module["FetchHttpClient"],
      OpenAiClient: OpenAiClient as Effect4Module["OpenAiClient"]
    }))
  }
  return runtimePromise
}

function systemRole(model: string): "developer" | "system" {
  if (
    model.startsWith("o") ||
    model.startsWith("gpt-5") ||
    model.startsWith("codex-") ||
    model.startsWith("computer-use")
  ) {
    return "developer"
  }
  return "system"
}

function fileBytes(data: OpenAiFilePart["data"]): Uint8Array {
  if (data instanceof Uint8Array) {
    return data
  }
  if (typeof data === "string") {
    return Buffer.from(data)
  }
  throw new Error("OpenAI file parts must be inline bytes")
}

function fileContent(file: OpenAiFilePart): Record<string, string> {
  if (file.mediaType !== "application/pdf") {
    throw new Error(`Unsupported OpenAI file media type: ${file.mediaType}`)
  }
  const base64 = Buffer.from(fileBytes(file.data)).toString("base64")
  return {
    type: "input_file",
    filename: file.fileName ?? "materi.pdf",
    file_data: `data:application/pdf;base64,${base64}`
  }
}

function requestPayload(request: OpenAiCompletionRequest): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    model: request.model,
    max_output_tokens: request.maxOutputTokens,
    input: [
      {
        role: systemRole(request.model),
        content: [{ type: "input_text", text: request.system }]
      },
      {
        role: "user",
        content: [
          ...request.files.map((file) => fileContent(file)),
          { type: "input_text", text: request.userText }
        ]
      }
    ]
  }
  if (request.jsonSchema !== undefined) {
    payload["text"] = {
      format: {
        type: "json_schema",
        name: request.jsonSchema.name,
        schema: request.jsonSchema.schema,
        strict: true
      }
    }
  }
  return payload
}

function finishReason(status: string | undefined, text: string): OpenAiFinishPart["reason"] {
  if (status === "incomplete") {
    return "length"
  }
  if (status === "completed" || text.length > 0) {
    return "stop"
  }
  return "unknown"
}

function readOutputText(body: {
  readonly output?: ReadonlyArray<{
    readonly type?: string
    readonly content?: ReadonlyArray<{ readonly type?: string; readonly text?: string }>
  }>
}): string {
  const chunks: Array<string> = []
  for (const item of body.output ?? []) {
    if (item.type !== "message" || item.content === undefined) {
      continue
    }
    for (const part of item.content) {
      if ((part.type === "output_text" || part.type === "text") && part.text !== undefined) {
        chunks.push(part.text)
      }
    }
  }
  return chunks.join("")
}

function readUsage(body: {
  readonly usage?: {
    readonly input_tokens?: number
    readonly output_tokens?: number
    readonly total_tokens?: number
  }
}): OpenAiFinishPart["usage"] {
  return {
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
    totalTokens: body.usage?.total_tokens ?? 0
  }
}

async function runWithClient<A>(
  request: OpenAiCompletionRequest,
  use: (client: OpenAiService, runtime: Effect4Module) => unknown
): Promise<A> {
  const runtime = await loadRuntime()
  const clientOptions: { readonly apiKey: unknown; readonly apiUrl?: string } = {
    apiKey: runtime.Redacted.make(request.apiKey),
    ...(request.apiUrl !== undefined ? { apiUrl: request.apiUrl } : {})
  }
  const httpLayer = runtime.Layer.provide(
    runtime.FetchHttpClient.layer,
    runtime.Layer.succeed(
      runtime.FetchHttpClient.Fetch,
      (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args)
    )
  )
  const clientLayer = runtime.Layer.provide(
    runtime.OpenAiClient.layer(clientOptions),
    httpLayer
  )
  const program = runtime.OpenAiClient.OpenAiClient.use((client) => use(client, runtime))
  try {
    return await runtime.Effect.runPromise(
      runtime.Effect.provide(program, clientLayer, { local: true })
    ) as A
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    throw new Error(message, { cause })
  }
}

export async function completeOpenAiParts(
  request: OpenAiCompletionRequest
): Promise<ReadonlyArray<OpenAiResponsePart>> {
  const body = await runWithClient<[{
    readonly status?: string
    readonly output?: ReadonlyArray<{
      readonly type?: string
      readonly content?: ReadonlyArray<{ readonly type?: string; readonly text?: string }>
    }>
    readonly usage?: {
      readonly input_tokens?: number
      readonly output_tokens?: number
      readonly total_tokens?: number
    }
  }, unknown]>(request, (client) => client.createResponse(requestPayload(request)))
  const decoded = body[0]
  const text = readOutputText(decoded)
  return [
    { type: "text", text },
    {
      type: "finish",
      reason: finishReason(decoded.status, text),
      usage: readUsage(decoded)
    }
  ]
}

interface OpenAiStreamEvent {
  readonly type?: string
  readonly delta?: string
  readonly response?: {
    readonly status?: string
    readonly usage?: {
      readonly input_tokens?: number
      readonly output_tokens?: number
      readonly total_tokens?: number
    }
  }
}

function asStreamEvents(chunk: unknown): ReadonlyArray<OpenAiStreamEvent> {
  if (chunk !== null && typeof chunk === "object" && Symbol.iterator in chunk) {
    return Array.from(chunk as Iterable<OpenAiStreamEvent>)
  }
  return []
}

export async function* streamOpenAiParts(
  request: OpenAiCompletionRequest
): AsyncGenerator<OpenAiStreamPart | OpenAiFinishPart> {
  const events = await runWithClient<ReadonlyArray<OpenAiStreamEvent>>(
    request,
    (client, runtime) =>
      runtime.Effect.flatMap(client.createResponseStream(requestPayload(request)), (tuple) => {
        const stream = (tuple as readonly [unknown, unknown])[1]
        return runtime.Effect.map(runtime.Stream.runCollect(stream), (chunk) => asStreamEvents(chunk))
      })
  )
  const id = "openai-text"
  let usage: OpenAiFinishPart["usage"] = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  let reason: OpenAiFinishPart["reason"] = "stop"
  yield { type: "text-start", id }
  for (const event of events) {
    if (event.type === "response.output_text.delta" && event.delta !== undefined) {
      yield { type: "text-delta", id, delta: event.delta }
    }
    if (
      (event.type === "response.completed" || event.type === "response.incomplete" ||
        event.type === "response.failed") &&
      event.response !== undefined
    ) {
      usage = readUsage(event.response)
      reason = event.type === "response.incomplete"
        ? "length"
        : event.type === "response.failed"
        ? "unknown"
        : "stop"
    }
  }
  yield { type: "text-end", id }
  yield { type: "finish", reason, usage }
}
