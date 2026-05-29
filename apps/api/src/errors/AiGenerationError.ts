import { Data } from "effect"

export class AiGenerationError extends Data.TaggedError("AiGenerationError")<{
  cause: unknown
}> {}
