import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"
const SCHOOL_IP = "203.0.113.50"

function makeSessionRow() {
  return {
    id: "ses-1",
    examId: "exam-1",
    classId: "cls-1",
    sessionCode: "ABC123",
    opensAt: new Date(NOW),
    closesAt: new Date(NOW),
    durationMinutes: 90,
    status: "open",
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW)
  }
}

function makeStudent(name: string, token: string) {
  return {
    id: `ss-${token}`,
    sessionId: "ses-1",
    studentId: null,
    studentName: name,
    identifier: null,
    token,
    joinedAt: new Date(NOW),
    submittedAt: null,
    answers: null
  }
}

describe("public session lockout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let enrolls = 0
    ;(db.select as Mock).mockImplementation(() => makeChain([makeSessionRow()]))
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => {
          enrolls += 1
          const name = enrolls === 1 ? "Budi" : "Siti"
          return makeChain([makeStudent(name, `tok-${enrolls}`)])
        })
      }))
    })
  })

  it("does not lock a classmate who shares the school IP", async () => {
    const app = buildHttpApiTestApp({
      authenticated: false,
      publicBankRateLimit: { windows: [{ windowMs: 60_000, max: 1 }] }
    })
    const headers = {
      "content-type": "application/json",
      "x-teacher-exam-peer": SCHOOL_IP,
      "cf-connecting-ip": SCHOOL_IP
    }

    const budi = await app.request("/api/sessions/ABC123/start", {
      method: "POST",
      headers,
      body: JSON.stringify({ studentName: "Budi" })
    })
    const budiAgain = await app.request("/api/sessions/ABC123/start", {
      method: "POST",
      headers,
      body: JSON.stringify({ studentName: "Budi" })
    })
    const siti = await app.request("/api/sessions/ABC123/start", {
      method: "POST",
      headers,
      body: JSON.stringify({ studentName: "Siti" })
    })

    expect(budi.status).toBe(201)
    expect(budiAgain.status).toBe(429)
    expect(siti.status).toBe(201)
  })
})
