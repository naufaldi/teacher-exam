import { Data } from 'effect'

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  cause: unknown
}> {}

export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  resource: string
  id: string
}> {}

export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{}> {}

export class AiGenerationError extends Data.TaggedError('AiGenerationError')<{
  cause: unknown
}> {}

export class PdfParseError extends Data.TaggedError('PdfParseError')<{
  cause: unknown
}> {}

export class ValidationError extends Data.TaggedError('ValidationError')<{
  message: string
}> {}
