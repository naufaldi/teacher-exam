import { describe, expect, it } from "vitest"
import { buildHttpApiTestApp } from "../http-api-setup"

const generateBody = {
  subject: "ipas",
  grade: 5,
  difficulty: "sedang",
  topics: ["Bab 1: Lingkungan"],
  reviewMode: "fast"
} as const

describe("POST /api/ai/generate source modes", () => {
  it("rejects pdf_guru without pdfUploadId", async () => {
    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const res = await app.request("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...generateBody,
        sourceMode: "pdf_guru",
        freeTopic: "Ekosistem dan pencemaran lingkungan"
      })
    })
    expect(res.status).toBe(400)
    const json = await res.json() as { details?: string }
    expect(json.details).toMatch(/PDF/i)
  })

  it("rejects combine without pdfUploadId", async () => {
    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const res = await app.request("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...generateBody,
        sourceMode: "combine"
      })
    })
    expect(res.status).toBe(400)
    const json = await res.json() as { details?: string }
    expect(json.details).toMatch(/PDF/i)
  })
})
