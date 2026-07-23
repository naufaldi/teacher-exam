import { describe, expect, it } from "vitest"
import { api } from "../api.js"

describe("api composed shape", () => {
  it("exposes every domain group", () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        "ai",
        "analytics",
        "bank",
        "classes",
        "curriculum",
        "exams",
        "feedback",
        "health",
        "me",
        "pdfUploads",
        "publicExams",
        "questions",
        "results",
        "sessions",
        "templates"
      ].sort()
    )
  })

  it("keeps key methods callable on each domain", () => {
    expect(typeof api.health.get).toBe("function")
    expect(typeof api.exams.list).toBe("function")
    expect(typeof api.exams.streamDiscussion).toBe("function")
    expect(typeof api.feedback.setExamOutcome).toBe("function")
    expect(typeof api.ai.generate).toBe("function")
    expect(typeof api.pdfUploads.create).toBe("function")
    expect(typeof api.curriculum.catalog).toBe("function")
    expect(typeof api.questions.regenerate).toBe("function")
    expect(typeof api.me.update).toBe("function")
    expect(typeof api.publicExams.export).toBe("function")
    expect(typeof api.bank.browseSheets).toBe("function")
    expect(typeof api.templates.apply).toBe("function")
    expect(typeof api.classes.students.bulkCreate).toBe("function")
    expect(typeof api.sessions.public.submit).toBe("function")
    expect(typeof api.results.get).toBe("function")
    expect(typeof api.analytics.getByClass).toBe("function")
  })
})
