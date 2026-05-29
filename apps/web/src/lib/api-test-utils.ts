import { Either } from "effect"

type ApiMock = {
  mockResolvedValueOnce?: (value: any) => unknown
  mockResolvedValue?: (value: any) => unknown
  mockImplementationOnce?: (fn: (...args: Array<any>) => any) => unknown
}

/** Wrap a mocked API return value for tests (api methods return Either). */
export function apiOk<T>(value: T): Promise<Either.Either<T, never>> {
  return Promise.resolve(Either.right(value))
}

export function apiFail<E>(error: E): Promise<Either.Either<never, E>> {
  return Promise.resolve(Either.left(error))
}

export function mockApiResolvedValueOnce(mock: ApiMock, value: unknown) {
  mock.mockResolvedValueOnce?.(Either.right(value))
}

export function mockApiResolvedValue(mock: ApiMock, value: unknown) {
  mock.mockResolvedValue?.(Either.right(value))
}

export function mockApiFailOnce(mock: ApiMock, error: unknown) {
  mock.mockResolvedValueOnce?.(Either.left(error))
}

/** For vi.spyOn(...).mockResolvedValue — returns Either.right. */
export function mockApiSpyResolvedValue<T extends ApiMock>(mock: T, value: unknown): T {
  mock.mockResolvedValue?.(Either.right(value))
  return mock
}

export function mockApiImplementationOnce<T, Args extends Array<unknown>>(
  mock: ApiMock,
  fn: (...args: Args) => Promise<T> | T
) {
  mock.mockImplementationOnce?.(
    ((...args: Args) =>
      Promise.resolve(fn(...args)).then((result) =>
        result !== null &&
          typeof result === "object" &&
          "_tag" in result &&
          (result._tag === "Left" || result._tag === "Right")
          ? result
          : Either.right(result)
      )) as (...args: Array<any>) => any
  )
}

export type { ApiMock }
