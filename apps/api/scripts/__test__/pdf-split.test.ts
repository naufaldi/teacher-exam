import { describe, expect, it } from "vitest"
import { planChunksFromPageSizes } from "../lib/pdf-split.js"

describe("PDF chunk planning", () => {
  it("splits chunks before they exceed the safe byte budget", () => {
    const oneMegabyte = 1024 * 1024
    const ranges = planChunksFromPageSizes({
      maxBytesPerChunk: 25 * oneMegabyte,
      maxPagesPerChunk: 60,
      overlapPages: 1,
      pageSizes: Array.from({ length: 6 }, () => 10 * oneMegabyte)
    })

    expect(ranges.map((range) => [range.startPage, range.endPage])).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6]
    ])
  })

  it("uses a conservative default byte budget below provider limits", () => {
    const oneMegabyte = 1024 * 1024
    const ranges = planChunksFromPageSizes({
      maxPagesPerChunk: 60,
      overlapPages: 1,
      pageSizes: Array.from({ length: 4 }, () => 8 * oneMegabyte)
    })

    expect(ranges.map((range) => [range.startPage, range.endPage])).toEqual([
      [1, 2],
      [2, 3],
      [3, 4]
    ])
  })
})
