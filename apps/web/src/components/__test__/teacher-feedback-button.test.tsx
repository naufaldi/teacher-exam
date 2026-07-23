import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TeacherFeedbackButton } from "../teacher-feedback-button.js"

describe("TeacherFeedbackButton", () => {
  it("renders a secure external link with print exclusion", () => {
    render(<TeacherFeedbackButton formUrl="https://forms.gle/example" />)
    const link = screen.getByRole("link", { name: "Beri Masukan" })
    expect(link).toHaveAttribute("href", "https://forms.gle/example")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(link).toHaveAttribute("data-no-print")
    expect(link.className).toContain("focus-visible:ring")
  })

  it("does not render for an invalid form URL", () => {
    const { container } = render(<TeacherFeedbackButton formUrl="javascript:alert(1)" />)
    expect(container).toBeEmptyDOMElement()
  })
})
