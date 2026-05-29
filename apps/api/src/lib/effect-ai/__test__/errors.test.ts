import { AiError } from "@effect/ai"
import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { appendConnectionContext, mapAiError } from "../errors"

describe("appendConnectionContext", () => {
  it("adds provider and host for connection errors", () => {
    const message = appendConnectionContext("Connection error.", {
      provider: "minimax",
      baseURL: "https://api.minimax.io/anthropic"
    })
    expect(message).toContain("provider=minimax")
    expect(message).toContain("host=api.minimax.io")
  })

  it("leaves unrelated errors unchanged", () => {
    expect(appendConnectionContext("Bad JSON", { provider: "anthropic" })).toBe("Bad JSON")
  })
})

describe("mapAiError", () => {
  it("maps HttpResponseError to AiGenerationError with HTTP status", () => {
    const error = mapAiError(
      new AiError.HttpResponseError({
        module: "AnthropicClient",
        method: "createMessage",
        reason: "StatusCode",
        description: "rate limited",
        request: {
          method: "POST",
          url: "https://api.anthropic.com/v1/messages",
          urlParams: [],
          hash: Option.none(),
          headers: {}
        },
        response: {
          status: 429,
          headers: {}
        }
      }),
      { provider: "anthropic" }
    )
    expect(String(error.cause)).toContain("[HTTP 429]")
  })
})
