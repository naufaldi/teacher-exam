import { useState } from 'react'
import type { Question, McqSingleQuestion, McqMultiQuestion, TrueFalseQuestion } from '@teacher-exam/shared'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  RadioGroup,
  RadioGroupItem,
  Badge,
} from '@teacher-exam/ui'
import { matchQuestion } from '../../lib/question-render.js'

export interface QuestionEditDialogProps {
  open: boolean
  question: Question
  onClose: () => void
  onSave: (updated: Question) => void
}

const LETTERS = ['a', 'b', 'c', 'd'] as const

// ── Per-type state shapes ─────────────────────────────────────────────────

interface McqSingleState {
  _tag: 'mcq_single'
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: 'a' | 'b' | 'c' | 'd'
}

interface McqMultiState {
  _tag: 'mcq_multi'
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: Array<'a' | 'b' | 'c' | 'd'>
}

interface TrueFalseState {
  _tag: 'true_false'
  text: string
  statements: Array<{ text: string; answer: boolean }>
}

type EditState = McqSingleState | McqMultiState | TrueFalseState

function initState(question: Question): EditState {
  return matchQuestion<EditState>(question, {
    mcq_single: (q) => ({
      _tag: 'mcq_single' as const,
      text: q.text,
      options: { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d },
      correct: q.correct,
    }),
    mcq_multi: (q) => ({
      _tag: 'mcq_multi' as const,
      text: q.text,
      options: { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d },
      correct: [...q.correct] as Array<'a' | 'b' | 'c' | 'd'>,
    }),
    true_false: (q) => ({
      _tag: 'true_false' as const,
      text: q.text,
      statements: q.statements.map((s) => ({ text: s.text, answer: s.answer })),
    }),
  })
}

function buildUpdated(question: Question, state: EditState): Question {
  if (state._tag === 'mcq_single') {
    const q = question as McqSingleQuestion
    return { ...q, text: state.text, options: state.options, correct: state.correct }
  }
  if (state._tag === 'mcq_multi') {
    const q = question as McqMultiQuestion
    const correct = state.correct as McqMultiQuestion['correct']
    return { ...q, text: state.text, options: state.options, correct }
  }
  // true_false
  const q = question as TrueFalseQuestion
  const statements = state.statements as TrueFalseQuestion['statements']
  return { ...q, text: state.text, statements }
}

function isValidState(state: EditState): boolean {
  if (state.text.trim() === '') return false
  if (state._tag === 'mcq_single') {
    return LETTERS.every((l) => state.options[l].trim() !== '')
  }
  if (state._tag === 'mcq_multi') {
    const validOptions = LETTERS.every((l) => state.options[l].trim() !== '')
    const validCorrect = state.correct.length >= 2 && state.correct.length <= 3
    return validOptions && validCorrect
  }
  // true_false
  return state.statements.length >= 3 && state.statements.every((s) => s.text.trim() !== '')
}

// ── Sub-form components ───────────────────────────────────────────────────

interface McqSingleFormProps {
  state: McqSingleState
  onChange: (s: McqSingleState) => void
}

function McqSingleForm({ state, onChange }: McqSingleFormProps) {
  return (
    <div className="space-y-3">
      <Label>Pilihan jawaban</Label>
      <RadioGroup
        value={state.correct}
        onValueChange={(v) => onChange({ ...state, correct: v as 'a' | 'b' | 'c' | 'd' })}
      >
        <div className="space-y-2">
          {LETTERS.map((letter) => {
            const isCorrect = state.correct === letter
            return (
              <div
                key={letter}
                className={[
                  'flex items-center gap-3 p-3 rounded-sm border transition-colors',
                  isCorrect
                    ? 'border-success-border bg-success-bg'
                    : 'border-border-default bg-bg-surface',
                ].join(' ')}
              >
                <RadioGroupItem
                  value={letter}
                  id={`opt-${letter}`}
                  aria-label={`Tandai pilihan ${letter.toUpperCase()} sebagai jawaban benar`}
                />
                <Label
                  htmlFor={`opt-${letter}`}
                  className="font-mono font-semibold text-body-sm shrink-0 w-5 cursor-pointer"
                >
                  {letter.toUpperCase()}.
                </Label>
                <Input
                  value={state.options[letter]}
                  onChange={(e) =>
                    onChange({ ...state, options: { ...state.options, [letter]: e.target.value } })
                  }
                  className="flex-1"
                />
              </div>
            )
          })}
        </div>
      </RadioGroup>
      <p className="text-caption text-text-tertiary">
        Jawaban benar saat ini:{' '}
        <span className="font-mono font-semibold text-success-fg">
          {state.correct.toUpperCase()}
        </span>
      </p>
    </div>
  )
}

interface McqMultiFormProps {
  state: McqMultiState
  onChange: (s: McqMultiState) => void
}

function McqMultiForm({ state, onChange }: McqMultiFormProps) {
  const toggleCorrect = (letter: 'a' | 'b' | 'c' | 'd') => {
    const next = state.correct.includes(letter)
      ? state.correct.filter((l) => l !== letter)
      : [...state.correct, letter]
    onChange({ ...state, correct: next })
  }

  return (
    <div className="space-y-3">
      <Label>Pilihan jawaban (pilih 2–3 jawaban benar)</Label>
      <div className="space-y-2">
        {LETTERS.map((letter) => {
          const isCorrect = state.correct.includes(letter)
          return (
            <div
              key={letter}
              className={[
                'flex items-center gap-3 p-3 rounded-sm border transition-colors',
                isCorrect
                  ? 'border-success-border bg-success-bg'
                  : 'border-border-default bg-bg-surface',
              ].join(' ')}
            >
              <input
                type="checkbox"
                id={`multi-opt-${letter}`}
                checked={isCorrect}
                onChange={() => toggleCorrect(letter)}
                className="h-4 w-4 rounded border-border-default"
                aria-label={`Tandai pilihan ${letter.toUpperCase()} sebagai jawaban benar`}
              />
              <Label
                htmlFor={`multi-opt-${letter}`}
                className="font-mono font-semibold text-body-sm shrink-0 w-5 cursor-pointer"
              >
                {letter.toUpperCase()}.
              </Label>
              <Input
                value={state.options[letter]}
                onChange={(e) =>
                  onChange({ ...state, options: { ...state.options, [letter]: e.target.value } })
                }
                className="flex-1"
              />
            </div>
          )
        })}
      </div>
      <p className="text-caption text-text-tertiary">
        Jawaban benar:{' '}
        <span className="font-mono font-semibold text-success-fg">
          {state.correct.map((l) => l.toUpperCase()).join(', ') || '—'}
        </span>
        {' '}(pilih 2–3)
      </p>
    </div>
  )
}

interface TrueFalseFormProps {
  state: TrueFalseState
  onChange: (s: TrueFalseState) => void
}

function TrueFalseForm({ state, onChange }: TrueFalseFormProps) {
  const updateStatement = (idx: number, patch: Partial<{ text: string; answer: boolean }>) => {
    const next = state.statements.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    onChange({ ...state, statements: next })
  }

  return (
    <div className="space-y-3">
      <Label>Pernyataan (Benar/Salah)</Label>
      <div className="space-y-3">
        {state.statements.map((s, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-sm border border-border-default bg-bg-surface"
          >
            <span className="font-mono text-caption shrink-0 w-5">{idx + 1}.</span>
            <Input
              value={s.text}
              onChange={(e) => updateStatement(idx, { text: e.target.value })}
              className="flex-1"
              placeholder={`Pernyataan ${idx + 1}`}
            />
            <RadioGroup
              value={s.answer ? 'true' : 'false'}
              onValueChange={(v) => updateStatement(idx, { answer: v === 'true' })}
              className="flex gap-3"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem
                  value="true"
                  id={`stmt-${idx}-true`}
                  aria-label={`Pernyataan ${idx + 1} Benar`}
                />
                <Label htmlFor={`stmt-${idx}-true`} className="text-body-sm cursor-pointer">B</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem
                  value="false"
                  id={`stmt-${idx}-false`}
                  aria-label={`Pernyataan ${idx + 1} Salah`}
                />
                <Label htmlFor={`stmt-${idx}-false`} className="text-body-sm cursor-pointer">S</Label>
              </div>
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main dialog ───────────────────────────────────────────────────────────

/**
 * Modal for editing a single soal — supports mcq_single, mcq_multi, true_false.
 * Used by both Fast Track ("Edit cepat") and Slow Track ("Edit") flows.
 */
export function QuestionEditDialog({
  open,
  question,
  onClose,
  onSave,
}: QuestionEditDialogProps) {
  const [editState, setEditState] = useState<EditState>(() => initState(question))

  const isValid = isValidState(editState)

  const handleSave = () => {
    if (!isValid) return
    onSave(buildUpdated(question, editState))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Soal #{question.number}</Badge>
            {question.topic !== null ? (
              <span className="text-caption text-text-tertiary">{question.topic}</span>
            ) : null}
          </div>
          <DialogTitle className="text-h3">Edit soal</DialogTitle>
          <DialogDescription>
            Perubahan akan langsung tersimpan ke draft lembar saat Anda klik Simpan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Question text */}
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Teks soal</Label>
            <Textarea
              id="q-text"
              value={editState.text}
              onChange={(e) => setEditState((s) => ({ ...s, text: e.target.value }))}
              rows={5}
            />
          </div>

          {/* Type-specific sub-form */}
          {editState._tag === 'mcq_single' && (
            <McqSingleForm
              state={editState}
              onChange={(s) => setEditState(s)}
            />
          )}
          {editState._tag === 'mcq_multi' && (
            <McqMultiForm
              state={editState}
              onChange={(s) => setEditState(s)}
            />
          )}
          {editState._tag === 'true_false' && (
            <TrueFalseForm
              state={editState}
              onChange={(s) => setEditState(s)}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Simpan perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
