import { describe, expect, it } from "vitest"
import {
  DEFAULT_COMPOSITION_BY_JENIS,
  DEFAULT_TOTAL_SOAL,
  EXAM_TYPE_LABEL_MAP,
  rescaleComposition
} from "../generate-exam-config.js"

describe("rescaleComposition", () => {
  it("keeps the total equal to newTotal", () => {
    const result = rescaleComposition({ mcqSingle: 18, mcqMulti: 4, trueFalse: 3 }, 25, 30)
    expect(result.mcqSingle + result.mcqMulti + result.trueFalse).toBe(30)
  })

  it("scales proportionally when doubling the total", () => {
    const result = rescaleComposition({ mcqSingle: 10, mcqMulti: 4, trueFalse: 6 }, 20, 40)
    expect(result.mcqSingle).toBe(20)
    expect(result.mcqMulti).toBe(8)
    expect(result.trueFalse).toBe(12)
  })

  it("never produces a negative trueFalse count", () => {
    const result = rescaleComposition({ mcqSingle: 20, mcqMulti: 0, trueFalse: 0 }, 20, 5)
    expect(result.trueFalse).toBeGreaterThanOrEqual(0)
    expect(result.mcqSingle + result.mcqMulti + result.trueFalse).toBe(5)
  })
})

describe("generate config maps", () => {
  it("has a default total and composition for every exam type label", () => {
    for (const jenis of Object.keys(EXAM_TYPE_LABEL_MAP)) {
      expect(DEFAULT_TOTAL_SOAL[jenis]).toBeGreaterThan(0)
      const comp = DEFAULT_COMPOSITION_BY_JENIS[jenis as keyof typeof DEFAULT_COMPOSITION_BY_JENIS]
      expect(comp.mcqSingle + comp.mcqMulti + comp.trueFalse).toBe(DEFAULT_TOTAL_SOAL[jenis])
    }
  })
})
