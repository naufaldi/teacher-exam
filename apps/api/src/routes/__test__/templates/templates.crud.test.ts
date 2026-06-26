import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"

function buildTestApp() {
  return buildHttpApiTestApp({ userId: "test-user-id" })
}

function makeTemplateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tpl-1",
    userId: "test-user-id",
    name: "Latihan IPAS",
    description: null,
    config: {
      subject: "ipas",
      grade: 5,
      difficulty: "sedang",
      topics: ["Energi"],
      reviewMode: "fast"
    },
    usageCount: 0,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

const VALID_CONFIG = {
  subject: "ipas",
  grade: 5,
  difficulty: "sedang",
  topics: ["Energi", "Gerak"],
  reviewMode: "fast",
  examType: "latihan",
  totalSoal: 20,
  composition: { mcqSingle: 15, mcqMulti: 0, trueFalse: 5 }
}

describe("GET /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns templates owned by the current user", async () => {
    const row = makeTemplateRow()
    ;(db.select as Mock).mockReturnValue(makeChain([row]))

    const app = buildTestApp()
    const res = await app.request("/api/templates")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body[0]?.["name"]).toBe("Latihan IPAS")
  })

  it("returns empty list when user has no templates", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/templates")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

describe("POST /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a template and returns 201", async () => {
    const row = makeTemplateRow({ id: "tpl-new", name: "Template baru" })
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => makeChain([row]))
      }))
    })

    const app = buildTestApp()
    const res = await app.request("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Template baru", config: VALID_CONFIG })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["name"]).toBe("Template baru")
  })

  it("returns 400 when config is missing topics", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad",
        config: { ...VALID_CONFIG, topics: [] }
      })
    })
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/templates/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renames an owned template", async () => {
    const row = makeTemplateRow({ name: "lama" })
    const updated = makeTemplateRow({ name: "baru" })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([row])
      return makeChain([updated])
    })
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/templates/tpl-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "baru" })
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["name"]).toBe("baru")
  })

  it("returns 404 when template not owned by user", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/templates/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x" })
    })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/templates/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes an owned template and returns 204", async () => {
    const row = makeTemplateRow()
    ;(db.select as Mock).mockReturnValue(makeChain([row]))
    ;(db.delete as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/templates/tpl-1", { method: "DELETE" })
    expect(res.status).toBe(204)
  })

  it("returns 404 when template not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/templates/missing", { method: "DELETE" })
    expect(res.status).toBe(404)
  })
})

describe("POST /api/templates/:id/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the prefilled GenerateExamInput", async () => {
    const row = makeTemplateRow({
      config: {
        subject: "ipas",
        grade: 5,
        difficulty: "sedang",
        topics: ["Energi", "Gerak"],
        reviewMode: "fast",
        examType: "latihan",
        totalSoal: 20,
        composition: { mcqSingle: 15, mcqMulti: 0, trueFalse: 5 }
      }
    })
    ;(db.select as Mock).mockReturnValue(makeChain([row]))
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/templates/tpl-1/apply", { method: "POST" })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["subject"]).toBe("ipas")
    expect(body["topics"]).toEqual(["Energi", "Gerak"])
  })

  it("returns 404 when template not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/templates/missing/apply", { method: "POST" })
    expect(res.status).toBe(404)
  })

  it("increments usageCount on apply", async () => {
    const row = makeTemplateRow({ usageCount: 2 })
    ;(db.select as Mock).mockReturnValue(makeChain([row]))
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    await app.request("/api/templates/tpl-1/apply", { method: "POST" })
    expect(db.update).toHaveBeenCalled()
  })
})

describe("template isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists only the current user's templates (DB filters by userId)", async () => {
    const ownRow = makeTemplateRow({ id: "tpl-own" }) // The service queries with WHERE userId = current user; the mock simulates
     // the DB returning only that user's rows.
    ;(db.select as Mock).mockReturnValue(makeChain([ownRow]))

    const app = buildTestApp()
    const res = await app.request("/api/templates")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body.every((t) => t["userId"] === "test-user-id")).toBe(true)
    expect(body).toHaveLength(1)
  })
})

describe("GET /api/templates without auth", () => {
  it("returns 401 when not authenticated", async () => {
    const app = buildHttpApiTestApp({ authenticated: false })
    const res = await app.request("/api/templates")
    expect(res.status).toBe(401)
  })
})
