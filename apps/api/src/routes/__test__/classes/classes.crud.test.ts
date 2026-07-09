import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeExamRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"

function buildTestApp() {
  return buildHttpApiTestApp({ userId: "test-user-id" })
}

function makeClassRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cls-1",
    userId: "test-user-id",
    name: "Kelas 5A",
    grade: 5,
    subject: "ipas",
    schoolName: null,
    academicYear: null,
    semester: null,
    defaultExamType: null,
    defaultExamDate: null,
    defaultDurationMinutes: null,
    defaultInstructions: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

function makeStudentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "std-1",
    classId: "cls-1",
    name: "Budi",
    identifier: "NIS-001",
    createdAt: new Date(NOW),
    ...overrides
  }
}

// makeExamRow is imported to satisfy the shared helpers surface used by the
// bank/templates suites; it is intentionally unused in this file.
void makeExamRow

describe("GET /api/classes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns classes owned by the current user", async () => {
    const row = makeClassRow()
    ;(db.select as Mock).mockReturnValue(makeChain([row]))

    const app = buildTestApp()
    const res = await app.request("/api/classes")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body[0]?.["name"]).toBe("Kelas 5A")
  })

  it("returns empty list when user has no classes", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/classes")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it("includes students when withStudents=true", async () => {
    const cls = makeClassRow()
    const student = makeStudentRow()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      return makeChain(selectCount === 1 ? [cls] : [student])
    })

    const app = buildTestApp()
    const res = await app.request("/api/classes?withStudents=true")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body[0]?.["students"]).toEqual([
      expect.objectContaining({ name: "Budi" })
    ])
  })
})

describe("POST /api/classes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a class and returns 201", async () => {
    const row = makeClassRow({
      id: "cls-new",
      name: "Kelas baru",
      schoolName: "SDN Jakarta",
      academicYear: "2025/2026",
      defaultExamType: "formatif"
    })
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => makeChain([row]))
      }))
    })

    const app = buildTestApp()
    const res = await app.request("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kelas baru",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        defaultExamType: "formatif",
        grade: 5,
        subject: "ipas"
      })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["name"]).toBe("Kelas baru")
  })

  it("creates a class with worksheet defaults", async () => {
    const row = makeClassRow({
      id: "cls-template",
      name: "Kelas 5A",
      subject: "matematika",
      schoolName: "SDN Jakarta",
      academicYear: "2025/2026",
      defaultExamType: "formatif",
      defaultExamDate: "2026-05-14",
      defaultDurationMinutes: 60,
      defaultInstructions: "Kerjakan dengan teliti."
    })
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => makeChain([row]))
      }))
    })

    const app = buildTestApp()
    const res = await app.request("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kelas 5A",
        grade: 5,
        subject: "matematika",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        defaultExamType: "formatif",
        defaultExamDate: "2026-05-14",
        defaultDurationMinutes: 60,
        defaultInstructions: "Kerjakan dengan teliti."
      })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["schoolName"]).toBe("SDN Jakarta")
    expect(body["defaultDurationMinutes"]).toBe(60)
    expect(body["defaultInstructions"]).toBe("Kerjakan dengan teliti.")
  })

  it("returns 400 when name is missing", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: 5 })
    })
    expect(res.status).toBe(400)
  })

  it("returns 400 when grade is out of range", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kelas",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        defaultExamType: "formatif",
        grade: 9
      })
    })
    expect(res.status).toBe(400)
  })

  it("returns 400 when template identity fields are missing", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kelas", grade: 5 })
    })
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/classes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renames an owned class", async () => {
    const row = makeClassRow({
      name: "lama",
      schoolName: "SDN Jakarta",
      academicYear: "2025/2026",
      defaultExamType: "formatif"
    })
    const updated = makeClassRow({
      name: "baru",
      schoolName: "SDN Jakarta",
      academicYear: "2025/2026",
      defaultExamType: "formatif"
    })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([row])
      return makeChain([updated])
    })
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "baru",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        defaultExamType: "formatif"
      })
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["name"]).toBe("baru")
  })

  it("updates worksheet defaults for an owned class", async () => {
    const row = makeClassRow({ name: "Kelas 5A" })
    const updated = makeClassRow({
      name: "Kelas 5A",
      schoolName: "SDN Baru",
      academicYear: "2026/2027",
      defaultExamType: "sas",
      defaultExamDate: "2026-12-10",
      defaultDurationMinutes: 120,
      defaultInstructions: "Dahulukan soal mudah."
    })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([row])
      return makeChain([updated])
    })
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kelas 5A",
        schoolName: "SDN Baru",
        academicYear: "2026/2027",
        defaultExamType: "sas",
        defaultExamDate: "2026-12-10",
        defaultDurationMinutes: 120,
        defaultInstructions: "Dahulukan soal mudah."
      })
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["schoolName"]).toBe("SDN Baru")
    expect(body["defaultExamType"]).toBe("sas")
    expect(body["defaultInstructions"]).toBe("Dahulukan soal mudah.")
  })

  it("returns 404 when class not owned by user", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/classes/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "x",
        schoolName: "SDN Jakarta",
        academicYear: "2025/2026",
        defaultExamType: "formatif"
      })
    })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/classes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes an owned class and returns 204", async () => {
    const row = makeClassRow()
    ;(db.select as Mock).mockReturnValue(makeChain([row]))
    ;(db.delete as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1", { method: "DELETE" })
    expect(res.status).toBe(204)
  })

  it("returns 404 when class not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/classes/missing", { method: "DELETE" })
    expect(res.status).toBe(404)
  })
})

describe("GET /api/classes/:id/students", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists students in an owned class", async () => {
    const cls = makeClassRow()
    const student = makeStudentRow()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      return makeChain(selectCount === 1 ? [cls] : [student])
    })

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1/students")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body[0]?.["name"]).toBe("Budi")
  })

  it("returns 404 when class not owned", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/classes/missing/students")
    expect(res.status).toBe(404)
  })
})

describe("POST /api/classes/:id/students", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("bulk creates students in an owned class", async () => {
    const cls = makeClassRow()
    const inserted = [
      makeStudentRow({ id: "std-1", name: "Budi" }),
      makeStudentRow({ id: "std-2", name: "Siti", identifier: null })
    ]
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      return makeChain(selectCount === 1 ? [cls] : [])
    })
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => makeChain(inserted))
    })

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        students: [
          { name: "Budi", identifier: "NIS-001" },
          { name: "Siti" }
        ]
      })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body).toHaveLength(2)
    expect(body[0]?.["name"]).toBe("Budi")
  })

  it("returns 404 when class not owned", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/classes/missing/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: [{ name: "Budi" }] })
    })
    expect(res.status).toBe(404)
  })

  it("returns 400 when students array is empty", async () => {
    const cls = makeClassRow()
    ;(db.select as Mock).mockReturnValue(makeChain([cls]))

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: [] })
    })
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/classes/:id/students/:studentId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("removes one student and returns 204", async () => {
    const cls = makeClassRow()
    const student = makeStudentRow()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([cls])
      return makeChain([student])
    })
    ;(db.delete as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1/students/std-1", {
      method: "DELETE"
    })
    expect(res.status).toBe(204)
  })

  it("returns 404 when student not found", async () => {
    const cls = makeClassRow()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([cls])
      return makeChain([])
    })

    const app = buildTestApp()
    const res = await app.request("/api/classes/cls-1/students/missing", {
      method: "DELETE"
    })
    expect(res.status).toBe(404)
  })

  it("returns 404 when class not owned", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/classes/missing/students/std-1", {
      method: "DELETE"
    })
    expect(res.status).toBe(404)
  })
})

describe("GET /api/classes without auth", () => {
  it("returns 401 when not authenticated", async () => {
    const app = buildHttpApiTestApp({ authenticated: false })
    const res = await app.request("/api/classes")
    expect(res.status).toBe(401)
  })
})
