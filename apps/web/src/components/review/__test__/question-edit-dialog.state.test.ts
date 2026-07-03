import { describe, expect, it } from "vitest"
import { makeMcqMulti, makeMcqSingle, makeTrueFalse } from "../../../test/fixtures/exam.js"
import {
  buildUpdated,
  initState,
  isValidState,
  type McqMultiState,
  type McqSingleState
} from "../question-edit-dialog.state.js"

describe("question-edit-dialog.state", () => {
  it("initState mirrors an mcq_single question", () => {
    const state = initState(makeMcqSingle(1, "b")) as McqSingleState
    expect(state._tag).toBe("mcq_single")
    expect(state.correct).toBe("b")
    expect(state.options.a).toBe("Pilihan A")
  })

  it("buildUpdated round-trips edited text back into the question", () => {
    const question = makeMcqSingle(1, "a")
    const state = initState(question)
    const updated = buildUpdated(question, { ...state, text: "Soal baru" })
    expect(updated.text).toBe("Soal baru")
    expect(updated._tag).toBe("mcq_single")
  })

  it("isValidState rejects empty question text", () => {
    const state = initState(makeMcqSingle(1))
    expect(isValidState({ ...state, text: "  " })).toBe(false)
  })

  it("isValidState requires 2-3 correct answers for mcq_multi", () => {
    const state = initState(makeMcqMulti(1, ["a"])) as McqMultiState
    expect(state._tag).toBe("mcq_multi")
    expect(isValidState(state)).toBe(false)
    expect(isValidState({ ...state, correct: ["a", "b"] })).toBe(true)
  })

  it("isValidState requires at least three non-empty statements for true_false", () => {
    const state = initState(makeTrueFalse(1, [true, false, true]))
    expect(isValidState(state)).toBe(true)
  })
})
