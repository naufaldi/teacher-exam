import { Effect, Stream } from "effect"
import type { AiGenerationError } from "../../errors"

function formatAiErrorMessage(err: AiGenerationError): string {
  const cause = err.cause
  if (typeof cause === "string" && cause.length > 0) {
    return cause
  }
  return String(cause)
}

function formatUnknownError(err: unknown): string {
  if (err && typeof err === "object" && "_tag" in err && err._tag === "AiGenerationError") {
    return formatAiErrorMessage(err as AiGenerationError)
  }
  if (err instanceof Error && err.message.length > 0) {
    return err.message
  }
  return "AI generation failed"
}

/**
 * Collects a discussion text stream, runs persistence, and returns an SSE Response.
 * Effect runs once at the ReadableStream boundary (no nested runPromise).
 */
export function runDiscussionSse<A>(
  stream: Stream.Stream<string, AiGenerationError>,
  onComplete: (discussionMd: string) => Effect.Effect<A, unknown, never>
): Response {
  const encoder = new TextEncoder()

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const writeSse = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      const heartbeat = setInterval(() => {
        writeSse("ping", "")
      }, 25_000)

      const program = Effect.gen(function*() {
        let discussionMd = ""
        yield* Stream.runForEach(stream, (chunk) =>
          Effect.sync(() => {
            discussionMd += chunk
            writeSse("chunk", JSON.stringify({ text: chunk }))
          }))
        return yield* onComplete(discussionMd)
      })

      void Effect.runPromise(
        program.pipe(
          Effect.match({
            onFailure: (err) => {
              clearInterval(heartbeat)
              writeSse("error", JSON.stringify({ message: formatUnknownError(err) }))
            },
            onSuccess: (result) => {
              clearInterval(heartbeat)
              writeSse(
                "done",
                typeof result === "string" ? result : JSON.stringify(result)
              )
            }
          }),
          Effect.ensuring(Effect.sync(() => {
            controller.close()
          }))
        )
      )
    }
  })

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  })
}
