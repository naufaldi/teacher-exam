import { Either } from 'effect'

/** Wrap a mocked API return value for tests (api methods return Either). */
export function apiOk<T>(value: T): Promise<typeof Either.right<T>> {
  return Promise.resolve(Either.right(value))
}

export function apiFail<T>(error: T): Promise<typeof Either.left<T>> {
  return Promise.resolve(Either.left(error))
}

export function mockApiResolvedValueOnce<T>(
  mock: { mockResolvedValueOnce: (value: unknown) => unknown },
  value: T,
) {
  mock.mockResolvedValueOnce(Either.right(value))
}

export function mockApiResolvedValue<T>(
  mock: { mockResolvedValue: (value: unknown) => unknown },
  value: T,
) {
  mock.mockResolvedValue(Either.right(value))
}

export function mockApiFailOnce<T>(
  mock: { mockResolvedValueOnce: (value: unknown) => unknown },
  error: T,
) {
  mock.mockResolvedValueOnce(Either.left(error))
}

/** For vi.spyOn(...).mockResolvedValue — returns Either.right. */
export function mockApiSpyResolvedValue<T>(
  spy: { mockResolvedValue: (value: unknown) => unknown },
  value: T,
) {
  return spy.mockResolvedValue(Either.right(value))
}

export function mockApiImplementationOnce<T, Args extends unknown[]>(
  mock: { mockImplementationOnce: (fn: (...args: Args) => Promise<unknown>) => unknown },
  fn: (...args: Args) => Promise<T> | T,
) {
  mock.mockImplementationOnce((...args: Args) =>
    Promise.resolve(fn(...args)).then((result) =>
      result !== null &&
      typeof result === 'object' &&
      '_tag' in result &&
      (result._tag === 'Left' || result._tag === 'Right')
        ? result
        : Either.right(result),
    ),
  )
}
