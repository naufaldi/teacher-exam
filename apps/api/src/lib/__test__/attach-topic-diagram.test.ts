import { checkFigureAnswer, FigureSpecSchema, type GeneratedQuestion } from "@teacher-exam/shared"
import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { attachTopicDiagram } from "../attach-topic-diagram"

function soal(
  number: number,
  topic: string,
  optionA: string
): GeneratedQuestion {
  return {
    _tag: "mcq_single",
    number,
    text: "Pecahan yang ditunjukkan daerah arsir pada gambar adalah ...",
    option_a: optionA,
    option_b: "1/5",
    option_c: "1/8",
    option_d: "2/7",
    correct_answer: "a",
    topic,
    difficulty: "mudah"
  }
}

describe("attachTopicDiagram", () => {
  it("attaches a circle on an even Pecahan soal and leaves a plain count alone", () => {
    const attached = attachTopicDiagram(soal(2, "Pecahan", "$\\frac{1}{2}$"), ["Bab 2 Pecahan"])
    expect(attached.figure).toEqual({
      type: "fraction",
      denominator: 2,
      shaded: 1,
      measure: "value",
      form: "circle"
    })
    if (attached._tag !== "mcq_single" || attached.figure == null) {
      throw new Error("expected a fraction figure")
    }
    const figure = Schema.decodeUnknownSync(FigureSpecSchema)(attached.figure)
    expect(checkFigureAnswer({
      _tag: "mcq_single",
      figure,
      options: {
        a: attached.option_a,
        b: attached.option_b,
        c: attached.option_c,
        d: attached.option_d
      },
      correct: attached.correct_answer
    })).toEqual({ _tag: "Match", derived: "1/2" })
    expect(attachTopicDiagram(soal(3, "Pecahan", "12"), ["Bab 2 Pecahan"]).figure).toBeUndefined()
  })

  it("attaches a number line, clock, or bar chart when that topic calls for it", () => {
    expect(attachTopicDiagram(soal(1, "Garis bilangan", "4"), ["Garis bilangan"]).figure).toEqual({
      type: "number_line",
      min: 0,
      max: 10,
      step: 1,
      marks: [{ value: 4 }],
      measure: { kind: "value", index: 0 }
    })
    expect(
      attachTopicDiagram({
        ...soal(1, "Membaca jam", "7:30"),
        option_b: "8:00",
        option_c: "6:30",
        option_d: "7:00"
      }, ["Bab 6 Pengukuran"]).figure
    ).toEqual({
      type: "clock",
      hour: 7,
      minute: 30,
      measure: "time"
    })
    expect(
      attachTopicDiagram({
        ...soal(1, "Diagram batang", "5"),
        option_b: "2",
        option_c: "8",
        option_d: "4"
      }, ["Diagram batang"]).figure
    ).toEqual({
      type: "bar_chart",
      bars: [{ name: "A", value: 5 }],
      measure: { kind: "value", index: 0 }
    })
  })

  it("leaves a non-diagram topic without a figure", () => {
    expect(attachTopicDiagram(soal(1, "Teks Narasi", "$\\frac{3}{4}$"), ["Teks Narasi"]).figure).toBeUndefined()
  })
})
