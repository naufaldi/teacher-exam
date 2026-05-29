import { getReviewSearch, mockNavigate } from "./setup.js"

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function lastReviewSearchResult() {
  const calls = mockNavigate.mock.calls as unknown as Array<
    [{ to?: string; search?: unknown }]
  >
  const reviewCall = [...calls].reverse().find(
    (c) => c[0]?.to === "/review" && typeof c[0]?.search === "function"
  )
  if (!reviewCall) throw new Error("expected a navigate({ to: \"/review\", search: fn }) call")
  const fn = reviewCall[0].search as (
    prev: ReturnType<typeof getReviewSearch>
  ) => Record<string, unknown>
  return fn(getReviewSearch())
}
