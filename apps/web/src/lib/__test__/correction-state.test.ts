import type { Answer } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { calcScore, correctionReducer, makeInitialState } from "../correction-state.js"

const KEY: Array<Answer> = ["a", "b", "c", "d"]

describe("calcScore", () => {
  it("awards 5 points per correct answer and counts wrong", () => {
    const result = calcScore(["a", "b", "a", null], KEY)
    expect(result.correct).toBe(2)
    expect(result.wrong).toBe(1)
    expect(result.score).toBe(10)
  })

  it("ignores unanswered slots and missing key entries", () => {
    expect(calcScore([null, null], KEY)).toEqual({ correct: 0, wrong: 0, score: 0 })
  })
})

describe("correctionReducer", () => {
  it("SET_ANSWER stores an answer at the given index", () => {
    const state = makeInitialState(KEY)
    const next = correctionReducer(state, { type: "SET_ANSWER", questionIndex: 1, answer: "b" })
    expect(next.currentAnswers[1]).toBe("b")
  })

  it("NEXT_STUDENT appends a scored rekap row and resets the sheet", () => {
    let state = makeInitialState(KEY)
    state = correctionReducer(state, { type: "SET_STUDENT_NAME", name: "Budi" })
    state = correctionReducer(state, { type: "SET_ANSWER", questionIndex: 0, answer: "a" })
    state = correctionReducer(state, { type: "NEXT_STUDENT" })
    expect(state.rekapList).toHaveLength(1)
    expect(state.rekapList[0]?.name).toBe("Budi")
    expect(state.rekapList[0]?.correct).toBe(1)
    expect(state.studentNumber).toBe(2)
    expect(state.currentAnswers.every((a) => a === null)).toBe(true)
  })

  it("NEXT_STUDENT falls back to a default name when blank", () => {
    let state = makeInitialState(KEY)
    state = correctionReducer(state, { type: "NEXT_STUDENT" })
    expect(state.rekapList[0]?.name).toBe("Murid 1")
  })

  it("RESET clears the current sheet without dropping rekap history", () => {
    let state = makeInitialState(KEY)
    state = correctionReducer(state, { type: "SET_ANSWER", questionIndex: 0, answer: "a" })
    state = correctionReducer(state, { type: "NEXT_STUDENT" })
    state = correctionReducer(state, { type: "SET_ANSWER", questionIndex: 0, answer: "b" })
    state = correctionReducer(state, { type: "RESET" })
    expect(state.rekapList).toHaveLength(1)
    expect(state.currentAnswers.every((a) => a === null)).toBe(true)
  })
})
