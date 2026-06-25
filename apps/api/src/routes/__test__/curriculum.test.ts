import { describe, expect, it } from "vitest"
import { TestCurriculumLayer } from "../../api/services/curriculum-service.js"
import { buildHttpApiTestApp } from "./http-api-setup.js"

const PPKN_K1_SNIPPET = `# Pendidikan Pancasila — Kelas 1

## Capaian Pembelajaran
- ...

## Bab 1: Aku dan Teman-Temanku
**Topik utama:** mengenal diri

## Bab 2: Aku Patuh pada Aturan
**Topik utama:** aturan

## Bab 3: Aku Mengenal Indonesia
**Topik utama:** indonesia

## Bab 4: Aku dan Lingkunganku
**Topik utama:** lingkungan
`

describe("GET /api/curriculum/catalog", () => {
  it("returns readiness for all corpus-backed elementary grades", async () => {
    const app = buildHttpApiTestApp()
    const res = await app.request("/api/curriculum/catalog")

    expect(res.status).toBe(200)
    const body = await res.json() as Array<{
      key: string
      grades: Array<{ grade: number; availability: string }>
    }>

    const bahasaIndonesia = body.find((item) => item.key === "bahasa_indonesia")
    const matematika = body.find((item) => item.key === "matematika")
    const ipas = body.find((item) => item.key === "ipas")

    expect(bahasaIndonesia?.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ grade: 1, availability: "ready" }),
        expect.objectContaining({ grade: 2, availability: "ready" }),
        expect.objectContaining({ grade: 3, availability: "ready" }),
        expect.objectContaining({ grade: 4, availability: "missing" }),
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
    expect(ipas?.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ grade: 1, availability: "disabled" }),
        expect.objectContaining({ grade: 2, availability: "disabled" }),
        expect.objectContaining({ grade: 3, availability: "ready" }),
        expect.objectContaining({ grade: 4, availability: "ready" })
      ])
    )
  })
})

describe("GET /api/curriculum/bab-topics", () => {
  it("returns Bab labels for ready PPKN Kelas 1", async () => {
    const app = buildHttpApiTestApp({ curriculumLayer: TestCurriculumLayer(PPKN_K1_SNIPPET) })
    const res = await app.request("/api/curriculum/bab-topics?subject=pendidikan_pancasila&grade=1")

    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ bab: number; title: string; label: string }>

    expect(body).toHaveLength(4)
    expect(body[0]).toEqual({
      bab: 1,
      title: "Aku dan Teman-Temanku",
      label: "Bab 1: Aku dan Teman-Temanku"
    })
  })

  it("returns empty array when subject grade is not ready for generate", async () => {
    const app = buildHttpApiTestApp()
    const res = await app.request("/api/curriculum/bab-topics?subject=ipas&grade=1")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})
