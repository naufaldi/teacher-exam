import { describe, expect, it } from "vitest"
import { profileIsComplete } from "../me.js"

describe("profileIsComplete", () => {
  it("completes onboarding when school is empty", () => {
    expect(profileIsComplete({
      username: "sari",
      gradesTaught: [5],
      subjectsTaught: ["bahasa_indonesia"]
    })).toBe(true)
  })
})
