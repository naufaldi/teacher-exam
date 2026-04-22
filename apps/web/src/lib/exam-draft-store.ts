import { useSyncExternalStore } from 'react'
import type { Question } from '@teacher-exam/shared'
import { MOCK_EXAM_FINAL, MOCK_EXAM_WITH_QUESTIONS } from './mock-data.js'

/**
 * In-memory draft of the exam currently being created/reviewed.
 * Shared across /generate, /review, /preview so navigation does not lose state.
 * Resets on full page reload — by design, no persistence in MVP.
 */
export interface ExamDraftMetadata {
  schoolName: string
  academicYear: string
  examType: string
  examDate: string
  durationMinutes: number
  instructions: string
}

export interface ExamDraft {
  questions: Question[]
  metadata: ExamDraftMetadata
  reviewMode: 'fast' | 'slow'
  subject: 'bahasa_indonesia' | 'pendidikan_pancasila'
  grade: number
  topic: string
}

function makeInitialDraft(): ExamDraft {
  return {
    questions: [...MOCK_EXAM_WITH_QUESTIONS.questions],
    metadata: {
      schoolName: MOCK_EXAM_FINAL.schoolName ?? '',
      academicYear: MOCK_EXAM_FINAL.academicYear ?? '',
      examType: MOCK_EXAM_FINAL.examType ?? 'TKA',
      examDate: MOCK_EXAM_FINAL.examDate ?? '',
      durationMinutes: MOCK_EXAM_FINAL.durationMinutes ?? 60,
      instructions: MOCK_EXAM_FINAL.instructions ?? '',
    },
    reviewMode: 'fast',
    subject: 'bahasa_indonesia',
    grade: 6,
    topic: MOCK_EXAM_FINAL.topic,
  }
}

let state: ExamDraft = makeInitialDraft()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const examDraftStore = {
  getSnapshot(): ExamDraft {
    return state
  },

  reset() {
    state = makeInitialDraft()
    emit()
  },

  setQuestions(questions: Question[]) {
    state = { ...state, questions }
    emit()
  },

  updateQuestion(id: string, patch: Partial<Question>) {
    state = {
      ...state,
      questions: state.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }
    emit()
  },

  replaceQuestion(id: string, replacement: Question) {
    state = {
      ...state,
      questions: state.questions.map((q) => (q.id === id ? replacement : q)),
    }
    emit()
  },

  setMetadata(patch: Partial<ExamDraftMetadata>) {
    state = { ...state, metadata: { ...state.metadata, ...patch } }
    emit()
  },

  setReviewMode(mode: 'fast' | 'slow') {
    state = { ...state, reviewMode: mode }
    emit()
  },

  setConfig(patch: Partial<Pick<ExamDraft, 'subject' | 'grade' | 'topic'>>) {
    state = { ...state, ...patch }
    emit()
  },
}

/**
 * React hook returning the current draft. Re-renders on any store update.
 */
export function useExamDraft(): ExamDraft {
  return useSyncExternalStore(subscribe, examDraftStore.getSnapshot, examDraftStore.getSnapshot)
}
