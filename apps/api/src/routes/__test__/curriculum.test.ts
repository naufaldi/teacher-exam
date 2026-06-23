import { describe, expect, it } from "vitest"
import { buildHttpApiTestApp } from "./http-api-setup.js"

describe("GET /api/curriculum/catalog", () => {
  it("returns Kelas 5 and 6 readiness for generate-supported subjects", async () => {
    const app = buildHttpApiTestApp()
    const res = await app.request("/api/curriculum/catalog")

    expect(res.status).toBe(200)
    const body = await res.json() as Array<{
      key: string
      grades: Array<{ grade: number; availability: string }>
    }>

    const bahasaIndonesia = body.find((item) => item.key === "bahasa_indonesia")
    const matematika = body.find((item) => item.key === "matematika")

    expect(bahasaIndonesia?.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ grade: 5, availability: "ready" }),
        expect.objectContaining({ grade: 6, availability: "ready" })
      ])
    )
    expect(matematika?.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ grade: 5, availability: "ready" }),
        expect.objectContaining({ grade: 6, availability: "ready" })
      ])
    )
  })
})
