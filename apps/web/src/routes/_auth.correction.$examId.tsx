import { memo, useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Printer, Users } from 'lucide-react'
import type { Answer } from '@teacher-exam/shared'
import {
  Button,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  EmptyState,
} from '@teacher-exam/ui'
import { MOCK_STUDENTS } from '../lib/mock-data.js'
import { api } from '../lib/api.js'
import { matchQuestion } from '../lib/question-render.js'

export const Route = createFileRoute('/_auth/correction/$examId')({
  loader: async ({ params }) => api.exams.get(params.examId),
  component: CorrectionPage,
})

// ── Types ─────────────────────────────────────────────────────────────────────

type StudentResult = {
  studentNumber: number
  name: string
  answers: (Answer | null)[]
  correct: number
  wrong: number
  score: number
}

type CorrectionState = {
  answerKey: Answer[]
  currentAnswers: (Answer | null)[]
  studentName: string
  studentNumber: number
  activeIndex: number
  rekapList: StudentResult[]
}

type CorrectionAction =
  | { type: 'SET_ANSWER'; questionIndex: number; answer: Answer }
  | { type: 'SET_STUDENT_NAME'; name: string }
  | { type: 'SET_ACTIVE_INDEX'; index: number }
  | { type: 'NEXT_STUDENT' }
  | { type: 'RESET' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcScore(answers: (Answer | null)[], answerKey: Answer[]): { correct: number; wrong: number; score: number } {
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

function makeInitialState(answerKey: Answer[]): CorrectionState {
  return {
    answerKey,
    currentAnswers: Array<Answer | null>(answerKey.length).fill(null),
    studentName: '',
    studentNumber: 1,
    activeIndex: 0,
    rekapList: [],
  }
}

function correctionReducer(state: CorrectionState, action: CorrectionAction): CorrectionState {
  switch (action.type) {
    case 'SET_ANSWER': {
      const next = [...state.currentAnswers]
      next[action.questionIndex] = action.answer
      return { ...state, currentAnswers: next }
    }
    case 'SET_STUDENT_NAME':
      return { ...state, studentName: action.name }
    case 'SET_ACTIVE_INDEX':
      return { ...state, activeIndex: action.index }
    case 'NEXT_STUDENT': {
      const { correct, wrong, score } = calcScore(state.currentAnswers, state.answerKey)
      const result: StudentResult = {
        studentNumber: state.studentNumber,
        name: state.studentName.trim() || `Murid ${state.studentNumber}`,
        answers: [...state.currentAnswers],
        correct,
        wrong,
        score,
      }
      const suggestedName = MOCK_STUDENTS[state.studentNumber] ?? ''
      return {
        ...state,
        currentAnswers: Array<Answer | null>(state.answerKey.length).fill(null),
        studentName: suggestedName,
        studentNumber: state.studentNumber + 1,
        activeIndex: 0,
        rekapList: [...state.rekapList, result],
      }
    }
    case 'RESET':
      return {
        ...state,
        currentAnswers: Array<Answer | null>(state.answerKey.length).fill(null),
        studentName: '',
        activeIndex: 0,
      }
    default:
      return state
  }
}

// ── Shared dispatch helper ────────────────────────────────────────────────────

function dispatchSelectAnswer(
  dispatch: React.Dispatch<CorrectionAction>,
  questionIndex: number,
  answer: Answer,
  activeIndex: number,
  totalQuestions: number,
) {
  dispatch({ type: 'SET_ANSWER', questionIndex, answer })
  if (activeIndex < totalQuestions - 1) {
    dispatch({ type: 'SET_ACTIVE_INDEX', index: activeIndex + 1 })
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

type AnswerRowProps = {
  questionIndex: number
  isActive: boolean
  selectedAnswer: Answer | null
  correctAnswer: Answer | undefined
  onSelect: (questionIndex: number, answer: Answer) => void
  onActivate: (questionIndex: number) => void
}

const ANSWER_OPTIONS: Answer[] = ['a', 'b', 'c', 'd']

const AnswerRow = memo(function AnswerRow({
  questionIndex,
  isActive,
  selectedAnswer,
  correctAnswer,
  onSelect,
  onActivate,
}: AnswerRowProps) {
  const isAnswered = selectedAnswer !== null
  const isCorrect = isAnswered && selectedAnswer === correctAnswer

  return (
    <TableRow
      className={[
        'cursor-pointer',
        isActive ? 'bg-kertas-100 hover:bg-kertas-100' : '',
      ].join(' ')}
      onClick={() => onActivate(questionIndex)}
    >
      <TableCell className="py-2 px-3 text-body-sm text-text-tertiary font-medium w-8 tabular-nums">
        {questionIndex + 1}.
      </TableCell>
      <TableCell className="py-2 px-3">
        <div className="flex gap-1">
          {ANSWER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(questionIndex, opt)
              }}
              className={[
                'w-8 h-8 rounded text-sm font-semibold uppercase transition-colors',
                selectedAnswer === opt
                  ? 'bg-primary-600 text-white'
                  : 'bg-kertas-50 border border-border-ui text-text-secondary hover:bg-kertas-200',
              ].join(' ')}
              aria-label={`Jawaban ${opt.toUpperCase()} untuk soal ${questionIndex + 1}`}
              aria-pressed={selectedAnswer === opt}
            >
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      </TableCell>
      <TableCell className="py-2 px-3 w-28">
        {isAnswered && correctAnswer != null ? (
          isCorrect ? (
            <span className="inline-flex items-center gap-1 text-success-700 text-body-sm font-medium">
              <span aria-hidden="true">&#10003;</span> Benar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-danger-700 text-body-sm font-medium">
              <span aria-hidden="true">&#10007;</span>{' '}
              <span className="text-text-tertiary">(kunci: {correctAnswer.toUpperCase()})</span>
            </span>
          )
        ) : (
          <span className="text-text-disabled text-body-sm">—</span>
        )}
      </TableCell>
    </TableRow>
  )
})

type ScoreDisplayProps = {
  correct: number
  total: number
}

function ScoreDisplay({ correct, total }: ScoreDisplayProps) {
  const score = correct * 5
  const percentage = total > 0 ? (correct / total) * 100 : 0

  return (
    <div className="space-y-2">
      <Progress value={percentage} className="h-3" />
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-text-secondary">
          Benar: <span className="font-semibold text-text-primary tabular-nums">{correct}</span> / {total}
        </span>
        <span className="text-text-secondary">
          Nilai:{' '}
          <span className="font-semibold text-text-primary tabular-nums text-lg">{score}</span> / 100
        </span>
      </div>
    </div>
  )
}

type RekapTableProps = {
  rekapList: StudentResult[]
  activeStudentNumber: number
}

function RekapTable({ rekapList, activeStudentNumber }: RekapTableProps) {
  if (rekapList.length === 0) {
    return (
      <EmptyState
        title="Belum ada murid yang dikoreksi"
        description="Selesaikan koreksi murid pertama untuk melihat rekap kelas."
        className="py-8"
      />
    )
  }

  const scores = rekapList.map((r) => r.score)
  const avg = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0
  const max = scores.length > 0 ? Math.max(...scores) : 0
  const min = scores.length > 0 ? Math.min(...scores) : 0

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 px-2 text-xs">No</TableHead>
          <TableHead className="text-xs">Nama</TableHead>
          <TableHead className="text-xs text-center">Benar</TableHead>
          <TableHead className="text-xs text-center">Salah</TableHead>
          <TableHead className="text-xs text-center">Nilai</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rekapList.map((student) => (
          <TableRow
            key={student.studentNumber}
            className={student.studentNumber === activeStudentNumber ? 'bg-kertas-100' : ''}
          >
            <TableCell className="px-2 py-2 text-body-sm text-text-tertiary tabular-nums">
              {student.studentNumber}.
            </TableCell>
            <TableCell className="py-2 text-body-sm font-medium text-text-primary">
              {student.name}
              {student.studentNumber === activeStudentNumber && (
                <span className="ml-1 text-xs text-primary-600">(aktif)</span>
              )}
            </TableCell>
            <TableCell className="py-2 text-center text-body-sm text-success-700 font-semibold tabular-nums">
              {student.correct}
            </TableCell>
            <TableCell className="py-2 text-center text-body-sm text-danger-700 font-semibold tabular-nums">
              {student.wrong}
            </TableCell>
            <TableCell className="py-2 text-center text-body-sm font-bold text-text-primary tabular-nums">
              {student.score}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={5} className="py-2 px-3 text-body-sm text-text-secondary">
            Rata-rata:{' '}
            <span className="font-semibold text-text-primary tabular-nums">{avg}</span>
            {' | '}Tertinggi:{' '}
            <span className="font-semibold text-text-primary tabular-nums">{max}</span>
            {' | '}Terendah:{' '}
            <span className="font-semibold text-text-primary tabular-nums">{min}</span>
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function CorrectionPage() {
  const exam = Route.useLoaderData()
  const answerKey: Answer[] = useMemo(
    () =>
      [...exam.questions]
        .sort((a, b) => a.number - b.number)
        .map((q) =>
          matchQuestion(q, {
            mcq_single: (x) => x.correct as Answer,
            mcq_multi: (x) => x.correct[0] ?? 'a',
            true_false: () => 'a' as Answer,
          }),
        ),
    [exam.questions],
  )

  const [state, dispatch] = useReducer(correctionReducer, answerKey, makeInitialState)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const totalQuestions = state.answerKey.length

  // Fix 5: memoize calcScore call
  const { correct, wrong, score } = useMemo(
    () => calcScore(state.currentAnswers, state.answerKey),
    [state.currentAnswers, state.answerKey],
  )

  // Fix 7: memoize name input onChange
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: 'SET_STUDENT_NAME', name: e.target.value }),
    [dispatch],
  )

  const handleSelectAnswer = useCallback(
    (questionIndex: number, answer: Answer) => {
      dispatchSelectAnswer(dispatch, questionIndex, answer, questionIndex, totalQuestions)
    },
    [totalQuestions],
  )

  const handleActivate = useCallback((questionIndex: number) => {
    dispatch({ type: 'SET_ACTIVE_INDEX', index: questionIndex })
  }, [])

  const handleNextStudent = useCallback(() => {
    dispatch({ type: 'NEXT_STUDENT' })
    nameInputRef.current?.focus()
  }, [])

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Fix 1: bail out entirely when focus is in any text input
      const target = e.target as HTMLElement
      const isTextInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable

      if (isTextInput) return

      const key = e.key.toLowerCase()

      if (key === 'a' || key === 'b' || key === 'c' || key === 'd') {
        e.preventDefault()
        dispatchSelectAnswer(dispatch, state.activeIndex, key as Answer, state.activeIndex, totalQuestions)
      } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        if (state.activeIndex < totalQuestions - 1) {
          e.preventDefault()
          dispatch({ type: 'SET_ACTIVE_INDEX', index: state.activeIndex + 1 })
        }
      } else if (e.key === 'Tab' && e.shiftKey) {
        if (state.activeIndex > 0) {
          e.preventDefault()
          dispatch({ type: 'SET_ACTIVE_INDEX', index: state.activeIndex - 1 })
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (state.activeIndex < totalQuestions - 1) {
          dispatch({ type: 'SET_ACTIVE_INDEX', index: state.activeIndex + 1 })
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (state.activeIndex > 0) {
          dispatch({ type: 'SET_ACTIVE_INDEX', index: state.activeIndex - 1 })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.activeIndex, totalQuestions])

  const handlePrintStudent = useCallback(() => {
    document.body.dataset['printMode'] = 'student'
    window.print()
    delete document.body.dataset['printMode']
  }, [])

  const handlePrintRekap = useCallback(() => {
    document.body.dataset['printMode'] = 'rekap'
    window.print()
    delete document.body.dataset['printMode']
  }, [])

  const suggestedPlaceholder = MOCK_STUDENTS[state.studentNumber - 1] ?? `Murid ${state.studentNumber}`

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Riwayat
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-h2 font-bold text-text-primary">Koreksi Cepat</h1>
        <p className="text-body text-text-secondary">
          {exam.title} &bull; {totalQuestions} soal
        </p>
      </div>

      {/* Warning banner */}
      <div className="rounded-sm border border-warning-200 bg-warning-50 px-4 py-3 text-body-sm text-warning-700">
        ⚠ Data koreksi tersimpan di browser saja. Data akan hilang jika halaman ditutup. Cetak terlebih dahulu jika perlu.
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT PANEL — grading area (60%) */}
        <div className="lg:w-[60%] space-y-4">
          {/* Student name input */}
          <div className="space-y-1">
            <label htmlFor="student-name" className="text-body-sm font-medium text-text-secondary">
              Nama Murid #{state.studentNumber}
            </label>
            <Input
              id="student-name"
              ref={nameInputRef}
              value={state.studentName}
              onChange={handleNameChange}
              placeholder={suggestedPlaceholder}
              className="max-w-xs"
            />
          </div>

          {/* Score display */}
          <ScoreDisplay correct={correct} total={totalQuestions} />

          {/* Answer grid — Fix 6: use UI Table components */}
          <div className="rounded-sm border border-border-ui overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 px-3 text-xs w-8">No</TableHead>
                  <TableHead className="py-2 px-3 text-xs">Pilihan</TableHead>
                  <TableHead className="py-2 px-3 text-xs w-28">Hasil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.currentAnswers.map((ans, idx) => (
                  <AnswerRow
                    key={idx}
                    questionIndex={idx}
                    isActive={state.activeIndex === idx}
                    selectedAnswer={ans}
                    correctAnswer={state.answerKey[idx]}
                    onSelect={handleSelectAnswer}
                    onActivate={handleActivate}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNextStudent}
            >
              Murid Berikutnya
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrintStudent}
              className="gap-1.5"
            >
              <Printer size={14} />
              Cetak Hasil Murid
            </Button>
          </div>

          {/* Current score summary card */}
          {(correct > 0 || wrong > 0) && (
            <div className="rounded-sm border border-border-ui bg-bg-surface p-4 space-y-1">
              <p className="text-body-sm font-semibold text-text-primary">
                {state.studentName.trim() || suggestedPlaceholder}
              </p>
              <div className="flex gap-4 text-body-sm">
                <span className="text-success-700">Benar: <span className="font-bold tabular-nums">{correct}</span></span>
                <span className="text-danger-700">Salah: <span className="font-bold tabular-nums">{wrong}</span></span>
                <span className="text-text-primary font-bold">Nilai: <span className="tabular-nums">{score}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — rekap (40%) */}
        <div className="lg:w-[40%] space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-text-tertiary" />
            <h2 className="text-body font-semibold text-text-primary">Rekap Kelas (sesi ini)</h2>
          </div>

          <RekapTable
            rekapList={state.rekapList}
            activeStudentNumber={state.studentNumber}
          />

          {state.rekapList.length > 0 && (
            <div className="space-y-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrintRekap}
                className="w-full gap-1.5"
              >
                <Printer size={14} />
                Cetak Rekap Kelas
              </Button>
              <p className="text-center text-xs text-text-tertiary">
                Data hilang jika tab ditutup
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
