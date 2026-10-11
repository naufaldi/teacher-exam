import { describe, expect, it } from "vitest"
import { shouldHydratePrerenderedRoot } from "../landing-bootstrap"

describe("shouldHydratePrerenderedRoot", () => {
  it("hydrates the prerendered landing at /", () => {
    expect(shouldHydratePrerenderedRoot("/", "", "LULUS KURIKULUM")).toBe(true)
  })

  it("does not hydrate other routes or a search variant", () => {
    expect(shouldHydratePrerenderedRoot("/dashboard", "", "LULUS KURIKULUM")).toBe(false)
    expect(shouldHydratePrerenderedRoot("/", "?reason=session_expired", "LULUS KURIKULUM")).toBe(false)
    expect(shouldHydratePrerenderedRoot("/", "", "")).toBe(false)
  })
})
