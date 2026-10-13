import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeQueryEffect } from "../../../__test__/mock-db.js"
import { renderExamHtml } from "../../../api/services/export-render.js"
import { ExportService } from "../../../api/services/export-service.js"
import { makeExamRow, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
const ADDRESS = "Jl. Melati No. 12"
const SCHOOL = "SD Negeri 2 Menteng"

type ProfileRow = {
  id: string
  email: string
  name: string
  username: string
  image: string | null
  school: string | null
  schoolAddress: string | null
  schoolLogo: string | null
  gradesTaught: Array<number>
  subjectsTaught: Array<string>
  profileCompleted: boolean
  locale: string
  timezone: string
}

function freshProfile(): ProfileRow {
  return {
    id: "test-user-id",
    email: "guru@sekolah.test",
    name: "Sari",
    username: "sari",
    image: null,
    school: SCHOOL,
    schoolAddress: null,
    schoolLogo: null,
    gradesTaught: [5],
    subjectsTaught: ["bahasa_indonesia"],
    profileCompleted: true,
    locale: "id-ID",
    timezone: "Asia/Jakarta"
  }
}

describe("profile kop reaches the exported sheet", () => {
  let profile: ProfileRow

  beforeEach(() => {
    vi.clearAllMocks()
    profile = freshProfile()
    const examRow = makeExamRow({
      status: "final",
      userId: "test-user-id",
      schoolName: "SD Lama"
    })
    const questionRow = makeQuestionRow({ status: "accepted" })
    ;(db.select as Mock).mockImplementation(() => {
      const chain = makeQueryEffect([])
      chain.from.mockImplementation((table: { id?: string }) => {
        if (table?.id === "user.id") return makeQueryEffect([profile])
        if (table?.id === "exams.id") return makeQueryEffect([examRow])
        return makeQueryEffect([questionRow])
      })
      return chain
    })
    ;(db.update as Mock).mockImplementation(() => {
      const chain = makeQueryEffect(undefined)
      chain.set.mockImplementation((values: Record<string, unknown>) => {
        const next: ProfileRow = { ...profile }
        for (const [key, value] of Object.entries(values)) {
          if (value !== undefined && key in next) {
            Reflect.set(next, key, value)
          }
        }
        profile = next
        return makeQueryEffect(undefined)
      })
      return chain
    })
  })

  it("saves the address and logo, then prints them in the export HTML", async () => {
    const app = buildHttpApiTestApp({
      userId: "test-user-id",
      exportServiceLayer: Layer.succeed(ExportService, {
        exportExamPdf: (exam, opts) => Effect.succeed(new TextEncoder().encode(renderExamHtml(exam, opts.variant))),
        exportExamDocx: () => Effect.succeed(new Uint8Array())
      })
    })

    const saved = await app.request("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schoolAddress: ADDRESS, schoolLogo: LOGO })
    })
    expect(saved.status).toBe(200)
    const savedBody = await saved.json() as { schoolAddress?: string; schoolLogo?: string }
    expect(savedBody.schoolAddress).toBe(ADDRESS)
    expect(savedBody.schoolLogo).toBe(LOGO)

    const exported = await app.request("/api/exams/exam-1/export?format=pdf&variant=soal")
    expect(exported.status).toBe(200)
    const html = await exported.text()
    expect(html).toContain(SCHOOL)
    expect(html).toContain(ADDRESS)
    expect(html).toContain(`<img class="logo" alt="" src="${LOGO}">`)
    expect(html).not.toContain("SD Lama")
  })

  it("rejects a logo that is not a png or jpeg data URL", async () => {
    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const saved = await app.request("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schoolLogo: "data:image/webp;base64,AAAA" })
    })
    expect(saved.status).toBe(400)
    expect(profile.schoolLogo).toBe(null)
  })
})
