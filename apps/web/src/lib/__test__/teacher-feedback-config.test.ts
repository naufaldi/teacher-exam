import { describe, expect, it } from "vitest"
import { parseTeacherFeedbackConfig } from "../teacher-feedback-config.js"

describe("parseTeacherFeedbackConfig", () => {
  it("enables feedback only for an explicit flag and HTTPS form URL", () => {
    expect(parseTeacherFeedbackConfig({
      VITE_TEACHER_FEEDBACK_ENABLED: "true",
      VITE_FEEDBACK_FORM_URL: "https://forms.gle/example"
    })).toEqual({
      enabled: true,
      formUrl: "https://forms.gle/example"
    })
  })

  it("silently disables missing and invalid configuration", () => {
    expect(parseTeacherFeedbackConfig({
      VITE_TEACHER_FEEDBACK_ENABLED: "true",
      VITE_FEEDBACK_FORM_URL: "javascript:alert(1)"
    })).toEqual({ enabled: false, formUrl: null })
    expect(parseTeacherFeedbackConfig({})).toEqual({ enabled: false, formUrl: null })
  })
})
