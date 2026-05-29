import { render } from "@testing-library/react"
import React from "react"
import { describe, expect, it } from "vitest"
import { makeExam } from "../../../test/fixtures/exam.js"
import { formatTopicsDisplay, MiniPaperPreview } from "../mini-paper-preview.js"

const BASE_EXAM = makeExam({
  title: "Test",
  schoolName: "SD Test",
  academicYear: "2025/2026",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
})

describe("MiniPaperPreview — subject short labels", () => {
  it("shows \"IPAS\" (not raw key) for ipas subject", () => {
    const { container } = render(
      <MiniPaperPreview exam={{ ...BASE_EXAM, subject: "ipas" }} />
    )
    // aria-hidden container — query DOM directly
    expect(container.textContent).toContain("IPAS")
    expect(container.textContent).not.toMatch(/\bipas\b/)
  })

  it("shows short label for bahasa_inggris subject", () => {
    const { container } = render(
      <MiniPaperPreview exam={{ ...BASE_EXAM, subject: "bahasa_inggris" }} />
    )
    expect(container.textContent).not.toMatch(/\bbahasa_inggris\b/)
  })
})

describe("formatTopicsDisplay", () => {
  it("shows a single topic as-is", () => {
    expect(formatTopicsDisplay(["Matematika"])).toBe("Matematika")
  })

  it("shows two topics joined with middle dot", () => {
    expect(formatTopicsDisplay(["Topic1", "Topic2"])).toBe("Topic1 · Topic2")
  })

  it("shows first 2 topics then +N for 3 topics", () => {
    expect(formatTopicsDisplay(["Topic1", "Topic2", "Topic3"])).toBe("Topic1 · Topic2 +1")
  })

  it("shows first 2 topics then +N for 5 topics", () => {
    expect(formatTopicsDisplay(["Topic1", "Topic2", "Topic3", "Topic4", "Topic5"])).toBe(
      "Topic1 · Topic2 +3"
    )
  })
})
