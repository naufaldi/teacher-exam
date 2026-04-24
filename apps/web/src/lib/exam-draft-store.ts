import { useSyncExternalStore } from 'react'
import type { ExamType, Question } from '@teacher-exam/shared'

/**
 * In-memory draft of the exam currently being created/reviewed.
 * Shared across /generate, /review, /preview so navigation does not lose state.
 * Resets on full page reload — by design, no persistence in MVP.
 */
export interface ExamDraftMetadata {
  schoolName: string
  academicYear: string
  /** Strict literal union — see PRD §8.6 */
  examType: ExamType
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
  /** Optional teacher-provided steering context (PRD §8.7). */
  classContext: string
}

function makeInitialDraft(): ExamDraft {
  return {
    questions: [],
    metadata: {
      schoolName: '',
      academicYear: '',
      examType: 'formatif',
      examDate: '',
      durationMinutes: 60,
      instructions: '',
    },
    reviewMode: 'fast',
    subject: 'bahasa_indonesia',
    grade: 6,
    topic: '',
    classContext: '',
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

  updateQuestion(id: string, replacement: Question) {
    state = {
      ...state,
      questions: state.questions.map((q) => (q.id === id ? replacement : q)),
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

  setConfig(
    patch: Partial<
      Pick<ExamDraft, 'subject' | 'grade' | 'topic' | 'classContext'> & {
        examType: ExamType
      }
    >,
  ) {
    const { examType, ...rest } = patch
    state = {
      ...state,
      ...rest,
      ...(examType !== undefined
        ? { metadata: { ...state.metadata, examType } }
        : {}),
    }
    emit()
  },
}

/**
 * React hook returning the current draft. Re-renders on any store update.
 */
export function useExamDraft(): ExamDraft {
  return useSyncExternalStore(subscribe, examDraftStore.getSnapshot, examDraftStore.getSnapshot)
}
