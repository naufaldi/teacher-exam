import type { Answer } from "@teacher-exam/shared"
import type { Dispatch } from "react"

export type StudentResult = {
  studentNumber: number
  name: string
  answers: Array<Answer | null>
  correct: number
  wrong: number
  score: number
}

export type CorrectionState = {
  answerKey: Array<Answer>
  currentAnswers: Array<Answer | null>
  studentName: string
  studentNumber: number
  activeIndex: number
  rekapList: Array<StudentResult>
}

export type CorrectionAction =
  | { type: "SET_ANSWER"; questionIndex: number; answer: Answer }
  | { type: "SET_STUDENT_NAME"; name: string }
  | { type: "SET_ACTIVE_INDEX"; index: number }
  | { type: "NEXT_STUDENT" }
  | { type: "RESET" }

export function calcScore(
  answers: Array<Answer | null>,
  answerKey: Array<Answer>
): { correct: number; wrong: number; score: number } {
  let correct = 0
  let wrong = 0
  for (let i = 0; i < answers.length; i++) {
    const ans = answers[i]
    if (ans == null) continue
    const key = answerKey[i]
    if (key == null) continue
    if (ans === key) {
      correct++
    } else {
      wrong++
    }
  }
  return { correct, wrong, score: correct * 5 }
}

export function makeInitialState(answerKey: Array<Answer>): CorrectionState {
  return {
    answerKey,
    currentAnswers: Array<Answer | null>(answerKey.length).fill(null),
    studentName: "",
    studentNumber: 1,
    activeIndex: 0,
    rekapList: []
  }
}

export function correctionReducer(state: CorrectionState, action: CorrectionAction): CorrectionState {
  switch (action.type) {
    case "SET_ANSWER": {
      const next = [...state.currentAnswers]
      next[action.questionIndex] = action.answer
      return { ...state, currentAnswers: next }
    }
    case "SET_STUDENT_NAME":
      return { ...state, studentName: action.name }
    case "SET_ACTIVE_INDEX":
      return { ...state, activeIndex: action.index }
    case "NEXT_STUDENT": {
      const { correct, score, wrong } = calcScore(state.currentAnswers, state.answerKey)
      const result: StudentResult = {
        studentNumber: state.studentNumber,
        name: state.studentName.trim() || `Murid ${state.studentNumber}`,
        answers: [...state.currentAnswers],
        correct,
        wrong,
        score
      }
      return {
        ...state,
        currentAnswers: Array<Answer | null>(state.answerKey.length).fill(null),
        studentName: "",
        studentNumber: state.studentNumber + 1,
        activeIndex: 0,
        rekapList: [...state.rekapList, result]
      }
    }
    case "RESET":
      return {
        ...state,
        currentAnswers: Array<Answer | null>(state.answerKey.length).fill(null),
        studentName: "",
        activeIndex: 0
      }
    default:
      return state
  }
}

export function dispatchSelectAnswer(
  dispatch: Dispatch<CorrectionAction>,
  questionIndex: number,
  answer: Answer,
  activeIndex: number,
  totalQuestions: number
) {
  dispatch({ type: "SET_ANSWER", questionIndex, answer })
  if (activeIndex < totalQuestions - 1) {
    dispatch({ type: "SET_ACTIVE_INDEX", index: activeIndex + 1 })
  }
}
