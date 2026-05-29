import { Effect, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { AiGenerationError } from "../../../errors"
import { runDiscussionSse } from "../sse-discussion"

function readSseEvents(body: string): Array<{ event: string; data: string }> {
  return body
    .split("\n\n")
    .filter((part) => part.trim().length > 0)
    .map((part) => {
      let event = ""
      let data = ""
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) {
          event = line.slice(7)
        } else if (line.startsWith("data: ")) {
          data = line.slice(6)
        }
      }
      return { event, data }
    })
}

async function collectSseBody(response: Response): Promise<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let body = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    body += decoder.decode(value, { stream: true })
  }
  return body
}

describe("runDiscussionSse", () => {
  it("emits chunk events before done", async () => {
    const stream = Stream.fromIterable(["Hello", " world"])
    const response = runDiscussionSse(
      stream,
      (discussionMd) => Effect.succeed(JSON.stringify({ discussionMd, ok: true }))
    )

    const body = await collectSseBody(response)
    const events = readSseEvents(body)
    const chunkEvents = events.filter((event) => event.event === "chunk")
    expect(chunkEvents).toHaveLength(2)
    expect(JSON.parse(chunkEvents[0]!.data)).toEqual({ text: "Hello" })
    expect(JSON.parse(chunkEvents[1]!.data)).toEqual({ text: " world" })
    expect(events.some((event) => event.event === "done")).toBe(true)
  })

  it("emits error event when stream fails mid-flight", async () => {
    const stream = Stream.concat(
      Stream.succeed("partial"),
      Stream.fail(new AiGenerationError({ cause: "provider down" }))
    )
    const response = runDiscussionSse(stream, () => Effect.succeed("unused"))

    const body = await collectSseBody(response)
    const events = readSseEvents(body)
    expect(events.some((event) => event.event === "error")).toBe(true)
    expect(events.some((event) => event.event === "done")).toBe(false)
  })
})
