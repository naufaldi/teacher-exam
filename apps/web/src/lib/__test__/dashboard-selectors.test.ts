import { describe, expect, it } from "vitest"
import { makeExam } from "../../test/fixtures/exam.js"
import { computeStats, computeWeeklyActivity, getRecentSheets } from "../dashboard-selectors.js"

// Fixed reference date: Friday, 2026-04-24 10:00 local (Jakarta +7, but tests run in UTC)
// We use a UTC date so tests are timezone-independent; the selector uses local time.
// For test determinism we pin to a UTC timestamp and test relative logic.
const NOW = new Date("2026-04-24T03:00:00.000Z") // 10am Jakarta = 03:00 UTC

describe("computeStats", () => {
  it("returns zeros for empty list", () => {
    expect(computeStats([])).toEqual({ totalSheets: 0, finalCount: 0, draftCount: 0 })
  })

  it("counts only final exams correctly", () => {
    const exams = [
      makeExam({ id: "1", status: "final" }),
      makeExam({ id: "2", status: "final" })
    ]
    expect(computeStats(exams)).toEqual({ totalSheets: 2, finalCount: 2, draftCount: 0 })
  })

  it("counts only draft exams correctly", () => {
    const exams = [makeExam({ id: "1", status: "draft" })]
    expect(computeStats(exams)).toEqual({ totalSheets: 1, finalCount: 0, draftCount: 1 })
  })

  it("splits mixed list in a single pass", () => {
    const exams = [
      makeExam({ id: "1", status: "final" }),
      makeExam({ id: "2", status: "draft" }),
      makeExam({ id: "3", status: "draft" }),
      makeExam({ id: "4", status: "final" }),
      makeExam({ id: "5", status: "draft" })
    ]
    expect(computeStats(exams)).toEqual({ totalSheets: 5, finalCount: 2, draftCount: 3 })
  })
})

describe("computeWeeklyActivity", () => {
  it("returns exactly 7 buckets for empty list", () => {
    const result = computeWeeklyActivity([], NOW)
    expect(result.days).toHaveLength(7)
    expect(result.days.every((b) => b.count === 0)).toBe(true)
    expect(result.uniqueSheetCount).toBe(0)
  })

  it("last bucket (today) has variant secondary", () => {
    const result = computeWeeklyActivity([], NOW)
    expect(result.days[6]?.variant).toBe("secondary")
  })

  it("all other buckets have variant default", () => {
    const result = computeWeeklyActivity([], NOW)
    for (let i = 0; i < 6; i++) {
      expect(result.days[i]?.variant).toBe("default")
    }
  })

  it("buckets are labelled with Indonesian weekday abbreviations", () => {
    const result = computeWeeklyActivity([], NOW)
    const LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
    for (const bucket of result.days) {
      expect(LABELS).toContain(bucket.day)
    }
  })

  it("counts exams created on the same local day in the correct bucket", () => {
    // NOW is 2026-04-24T03:00Z. In UTC that is still April 24.
    const exam = makeExam({ id: "1", createdAt: "2026-04-24T01:00:00.000Z" })
    const result = computeWeeklyActivity([exam], NOW)
    // The last bucket covers today (April 24 in UTC = same local day as NOW)
    expect(result.days[6]?.count).toBe(1)
    expect(result.days.slice(0, 6).every((b) => b.count === 0)).toBe(true)
    expect(result.uniqueSheetCount).toBe(1)
  })

  it("ignores exams older than 7 days with no recent touch", () => {
    const old = makeExam({
      id: "1",
      createdAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z"
    })
    const result = computeWeeklyActivity([old], NOW)
    expect(result.days.every((b) => b.count === 0)).toBe(true)
    expect(result.uniqueSheetCount).toBe(0)
  })

  it("counts exams in the correct day bucket (6 days ago)", () => {
    const exam = makeExam({
      id: "1",
      createdAt: "2026-04-18T02:00:00.000Z",
      updatedAt: "2026-04-18T02:00:00.000Z"
    })
    const result = computeWeeklyActivity([exam], NOW)
    expect(result.days[0]?.count).toBe(1)
    expect(result.days.slice(1).every((b) => b.count === 0)).toBe(true)
  })

  it("accumulates multiple exams on the same day", () => {
    const exams = [
      makeExam({ id: "1", createdAt: "2026-04-24T00:30:00.000Z" }),
      makeExam({ id: "2", createdAt: "2026-04-24T01:30:00.000Z" }),
      makeExam({ id: "3", createdAt: "2026-04-24T02:30:00.000Z" })
    ]
    const result = computeWeeklyActivity(exams, NOW)
    expect(result.days[6]?.count).toBe(3)
    expect(result.uniqueSheetCount).toBe(3)
  })

  it("counts a sheet touched yesterday even when created more than 7 days ago", () => {
    const exam = makeExam({
      id: "1",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-04-23T02:00:00.000Z"
    })
    const result = computeWeeklyActivity([exam], NOW)
    expect(result.days[5]?.count).toBe(1)
    expect(result.uniqueSheetCount).toBe(1)
  })

  it("counts create and touch on the same day only once per sheet", () => {
    const exam = makeExam({
      id: "1",
      createdAt: "2026-04-24T00:30:00.000Z",
      updatedAt: "2026-04-24T02:30:00.000Z"
    })
    const result = computeWeeklyActivity([exam], NOW)
    expect(result.days[6]?.count).toBe(1)
    expect(result.uniqueSheetCount).toBe(1)
  })

  it("counts create and touch on different days but unique total is one sheet", () => {
    const exam = makeExam({
      id: "1",
      createdAt: "2026-04-18T02:00:00.000Z",
      updatedAt: "2026-04-22T02:00:00.000Z"
    })
    const result = computeWeeklyActivity([exam], NOW)
    expect(result.days[0]?.count).toBe(1)
    expect(result.days[4]?.count).toBe(1)
    expect(result.uniqueSheetCount).toBe(1)
  })
})

describe("getRecentSheets", () => {
  it("returns empty array for empty input", () => {
    expect(getRecentSheets([], 5)).toEqual([])
  })

  it("returns all items when list is shorter than limit", () => {
    const exams = [makeExam({ id: "1" }), makeExam({ id: "2" })]
    expect(getRecentSheets(exams, 5)).toHaveLength(2)
  })

  it("caps at limit", () => {
    const exams = Array.from({ length: 10 }, (_, i) => makeExam({ id: `exam-${i}` }))
    expect(getRecentSheets(exams, 5)).toHaveLength(5)
  })

  it("preserves original order (does not sort)", () => {
    const exams = [
      makeExam({ id: "a", title: "First" }),
      makeExam({ id: "b", title: "Second" }),
      makeExam({ id: "c", title: "Third" })
    ]
    const result = getRecentSheets(exams, 2)
    expect(result[0]?.title).toBe("First")
    expect(result[1]?.title).toBe("Second")
  })
})
