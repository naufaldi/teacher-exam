import { describe, expect, it } from "vitest"
import { TOPICS_BY_SUBJECT } from "../generate-topics.js"

describe("TOPICS_BY_SUBJECT", () => {
  it("includes IPAS and Bahasa Inggris with at least six topics each", () => {
    expect(TOPICS_BY_SUBJECT.ipas.length).toBeGreaterThanOrEqual(6)
    expect(TOPICS_BY_SUBJECT.bahasa_inggris.length).toBeGreaterThanOrEqual(6)
  })

  it("uses distinct topic lists per subject", () => {
    expect(TOPICS_BY_SUBJECT.ipas).toContain("Cahaya dan Bunyi")
    expect(TOPICS_BY_SUBJECT.ipas).not.toContain("Kalimat Majemuk")
    expect(TOPICS_BY_SUBJECT.bahasa_inggris).toContain("Daily Activities")
    expect(TOPICS_BY_SUBJECT.bahasa_inggris).not.toContain("Cahaya dan Bunyi")
  })
})
