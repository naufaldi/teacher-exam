import { describe, expect, it } from "vitest"
import { formatDate, getGreetingTime } from "../dashboard-format.js"

describe("dashboard-format", () => {
  it("formatDate renders a long Indonesian date containing the year", () => {
    expect(formatDate("2026-07-05T00:00:00.000Z")).toContain("2026")
  })

  it("getGreetingTime returns one of the known time-of-day suffixes", () => {
    expect(["pagi", "siang", "sore", "malam"]).toContain(getGreetingTime())
  })
})
