import { describe, expect, it } from "vitest"
import { adjustGenerateResponseStatus } from "../generate-response"

describe("adjustGenerateResponseStatus", () => {
  it("rewrites async generate body to 202", async () => {
    const request = new Request("http://localhost/api/ai/generate", { method: "POST" })
    const response = new Response(JSON.stringify({ examId: "exam-1", jobId: "job-1" }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    })

    const adjusted = await adjustGenerateResponseStatus(request, response)
    expect(adjusted.status).toBe(202)
    expect(await adjusted.json()).toEqual({ examId: "exam-1", jobId: "job-1" })
  })

  it("keeps sync generate at 201", async () => {
    const request = new Request("http://localhost/api/ai/generate", { method: "POST" })
    const response = new Response(JSON.stringify({ id: "exam-1", questions: [] }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    })

    const adjusted = await adjustGenerateResponseStatus(request, response)
    expect(adjusted.status).toBe(201)
  })
})
