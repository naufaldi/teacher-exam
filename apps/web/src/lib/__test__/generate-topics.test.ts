import { describe, expect, it } from "vitest"
import { getTopicsForGenerate, TOPICS_BY_SUBJECT_AND_GRADE } from "../generate-topics.js"

describe("getTopicsForGenerate", () => {
  it("returns empty when grade is unset", () => {
    expect(getTopicsForGenerate("ipas", undefined)).toEqual([])
    expect(getTopicsForGenerate("ipas", null)).toEqual([])
  })

  it("returns grade-specific IPAS Bab titles", () => {
    const k5 = getTopicsForGenerate("ipas", 5)
    const k6 = getTopicsForGenerate("ipas", 6)

    expect(k5).toContain("Harmoni dalam Ekosistem")
    expect(k5).not.toContain("Bencana Alam dan Kesiapsiagaan")
    expect(k6).toContain("Bencana Alam dan Kesiapsiagaan")
    expect(k6).not.toContain("Harmoni dalam Ekosistem")
    expect(k5.length).toBe(6)
    expect(k6.length).toBe(6)
  })

  it("returns a safe corpus-backed fallback topic for ready lower grades without curated topics", () => {
    expect(getTopicsForGenerate("bahasa_indonesia", 1)).toEqual(["Materi sesuai Buku Siswa"])
  })

  it("returns grade-specific Bahasa Inggris Bab titles", () => {
    const k5 = getTopicsForGenerate("bahasa_inggris", 5)
    const k6 = getTopicsForGenerate("bahasa_inggris", 6)

    expect(k5).toContain("My Daily Activities")
    expect(k5).not.toContain("Simple Reports about Nature and Technology")
    expect(k6).toContain("Simple Reports about Nature and Technology")
    expect(k6).toContain("My Past Experiences")
    expect(k5.length).toBe(6)
    expect(k6.length).toBe(6)
  })

  it("returns grade-specific Matematika non-diagram topik without diagram topics", () => {
    const k5 = getTopicsForGenerate("matematika", 5)
    const k6 = getTopicsForGenerate("matematika", 6)

    expect(k5).toContain("Bilangan Cacah dan Operasi Hitung")
    expect(k5).toContain("Data")
    expect(k6).toContain("Data dan Peluang Awal")
    expect(k6).toContain("Pecahan, Desimal, Rasio, dan Persen")
    expect(k5).not.toContain("Bangun Datar")
    expect(k5).not.toContain("Bangun Ruang")
    expect(k5).not.toContain("Bidang Koordinat")
    expect(k6).not.toContain("Bangun Datar")
  })

  it("uses the same competency list for BI and PPKN across grades", () => {
    const biK5 = getTopicsForGenerate("bahasa_indonesia", 5)
    const biK6 = getTopicsForGenerate("bahasa_indonesia", 6)
    const ppknK5 = getTopicsForGenerate("pendidikan_pancasila", 5)
    const ppknK6 = getTopicsForGenerate("pendidikan_pancasila", 6)

    expect(biK5).toEqual(biK6)
    expect(ppknK5).toEqual(ppknK6)
    expect(biK5).toContain("Pemahaman Bacaan")
    expect(ppknK5).toContain("Gotong Royong")
  })
})

describe("TOPICS_BY_SUBJECT_AND_GRADE", () => {
  it("defines separate K5 and K6 arrays for IPAS and Bahasa Inggris", () => {
    expect(TOPICS_BY_SUBJECT_AND_GRADE.ipas[5]).not.toEqual(TOPICS_BY_SUBJECT_AND_GRADE.ipas[6])
    expect(TOPICS_BY_SUBJECT_AND_GRADE.bahasa_inggris[5]).not.toEqual(
      TOPICS_BY_SUBJECT_AND_GRADE.bahasa_inggris[6]
    )
  })
})
