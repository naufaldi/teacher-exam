import type { ExamSubject, Question } from "@teacher-exam/shared"
import { detectBrokenMatematikaLatex } from "@teacher-exam/shared"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea
} from "@teacher-exam/ui"
import { useRef, useState } from "react"
import {
  applyMatematikaTextRepair,
  buildUpdated,
  type EditState,
  getPreviewText,
  initState,
  insertSnippet,
  isValidState,
  LETTERS,
  MATH_INSERTS,
  type McqMultiState,
  type McqSingleState,
  type TrueFalseState
} from "./question-edit-dialog.state.js"
import { TeacherPreviewBlock } from "./teacher-preview-block.js"

export interface QuestionEditDialogProps {
  open: boolean
  question: Question
  subject?: ExamSubject | undefined
  onClose: () => void
  onSave: (updated: Question) => void
}

interface McqSingleFormProps {
  state: McqSingleState
  isMatematika: boolean
  onChange: (s: McqSingleState) => void
}

function McqSingleForm({ isMatematika, onChange, state }: McqSingleFormProps) {
  return (
    <div className="space-y-3">
      <Label>Pilihan jawaban</Label>
      <RadioGroup
        value={state.correct}
        onValueChange={(v) => onChange({ ...state, correct: v as "a" | "b" | "c" | "d" })}
      >
        <div className="space-y-2">
          {LETTERS.map((letter) => {
            const isCorrect = state.correct === letter
            return (
              <div
                key={letter}
                className={[
                  "p-3 rounded-sm border transition-colors",
                  isCorrect
                    ? "border-success-border bg-success-bg"
                    : "border-border-default bg-bg-surface"
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value={letter}
                    id={`opt-${letter}`}
                    className="mt-2.5"
                    aria-label={`Tandai pilihan ${letter.toUpperCase()} sebagai jawaban benar`}
                  />
                  <Label
                    htmlFor={`opt-${letter}`}
                    className="font-mono font-semibold text-body-sm shrink-0 w-5 cursor-pointer mt-2"
                  >
                    {letter.toUpperCase()}.
                  </Label>
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input
                      value={state.options[letter]}
                      onChange={(e) => onChange({ ...state, options: { ...state.options, [letter]: e.target.value } })}
                    />
                    <TeacherPreviewBlock
                      text={getPreviewText(state.options[letter], isMatematika)}
                      testId={`edit-option-preview-${letter}`}
                      variant="option"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </RadioGroup>
      <p className="text-caption text-text-tertiary">
        Jawaban benar saat ini:{" "}
        <span className="font-mono font-semibold text-success-fg">
          {state.correct.toUpperCase()}
        </span>
      </p>
    </div>
  )
}

interface McqMultiFormProps {
  state: McqMultiState
  isMatematika: boolean
  onChange: (s: McqMultiState) => void
}

function McqMultiForm({ isMatematika, onChange, state }: McqMultiFormProps) {
  const toggleCorrect = (letter: "a" | "b" | "c" | "d") => {
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
                "p-3 rounded-sm border transition-colors",
                isCorrect
                  ? "border-success-border bg-success-bg"
                  : "border-border-default bg-bg-surface"
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`multi-opt-${letter}`}
                  checked={isCorrect}
                  onChange={() => toggleCorrect(letter)}
                  className="mt-2.5 h-4 w-4 rounded border-border-default"
                  aria-label={`Tandai pilihan ${letter.toUpperCase()} sebagai jawaban benar`}
                />
                <Label
                  htmlFor={`multi-opt-${letter}`}
                  className="font-mono font-semibold text-body-sm shrink-0 w-5 cursor-pointer mt-1.5"
                >
                  {letter.toUpperCase()}.
                </Label>
                <div className="flex-1 min-w-0 space-y-2">
                  <Input
                    value={state.options[letter]}
                    onChange={(e) => onChange({ ...state, options: { ...state.options, [letter]: e.target.value } })}
                  />
                  <TeacherPreviewBlock
                    text={getPreviewText(state.options[letter], isMatematika)}
                    testId={`edit-option-preview-${letter}`}
                    variant="option"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-caption text-text-tertiary">
        Jawaban benar:{" "}
        <span className="font-mono font-semibold text-success-fg">
          {state.correct.map((l) => l.toUpperCase()).join(", ") || "—"}
        </span>{" "}
        (pilih 2–3)
      </p>
    </div>
  )
}

interface TrueFalseFormProps {
  state: TrueFalseState
  onChange: (s: TrueFalseState) => void
}

function TrueFalseForm({ onChange, state }: TrueFalseFormProps) {
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
              value={s.answer ? "true" : "false"}
              onValueChange={(v) => updateStatement(idx, { answer: v === "true" })}
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

/**
 * Modal for editing a single soal — supports mcq_single, mcq_multi, true_false.
 * Used by both Fast Track ("Edit cepat") and Slow Track ("Edit") flows.
 */
export function QuestionEditDialog({
  onClose,
  onSave,
  open,
  question,
  subject
}: QuestionEditDialogProps) {
  const [editState, setEditState] = useState<EditState>(() => initState(question))
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const isMatematika = subject === "matematika"
  const brokenIssues = isMatematika ? detectBrokenMatematikaLatex(editState.text) : []
  const previewText = getPreviewText(editState.text, isMatematika)

  const isValid = isValidState(editState)

  const handleInsert = (snippet: string) => {
    const textarea = textAreaRef.current
    if (textarea === null) return
    const { cursor, next } = insertSnippet(textarea, editState.text, snippet)
    setEditState((s) => ({ ...s, text: next }))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleSave = () => {
    if (!isValid) return
    const repairedText = isMatematika ? applyMatematikaTextRepair(editState.text) : editState.text
    const stateToSave = { ...editState, text: repairedText }
    onSave(buildUpdated(question, stateToSave))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Soal #{question.number}</Badge>
            {question.topic !== null ? <span className="text-caption text-text-tertiary">{question.topic}</span> : null}
          </div>
          <DialogTitle className="text-h3">Edit soal</DialogTitle>
          <DialogDescription>
            Perubahan akan langsung tersimpan ke draft lembar saat Anda klik Simpan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Teks soal</Label>
            {isMatematika ?
              (
                <div className="flex flex-wrap gap-2" data-testid="math-insert-bar">
                  {MATH_INSERTS.map((item) => (
                    <Button
                      key={item.label}
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label={item.ariaLabel}
                      onClick={() => handleInsert(item.snippet)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              ) :
              null}
            <Textarea
              ref={textAreaRef}
              id="q-text"
              value={editState.text}
              onChange={(e) => setEditState((s) => ({ ...s, text: e.target.value }))}
              rows={5}
            />
            <p className="text-caption text-text-tertiary">
              {isMatematika ?
                (
                  <>
                    Notasi matematika memakai $...$.{" "}
                    <a
                      href="/help/notasi-matematika"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 underline underline-offset-2 hover:text-primary-700"
                    >
                      Panduan notasi matematika ↗
                    </a>
                  </>
                ) :
                (
                  "Pratinjau tampilan guru di bawah."
                )}
            </p>
            {brokenIssues.length > 0 ?
              (
                <div
                  className="rounded-sm border border-warning-border bg-warning-bg px-3 py-2 text-caption text-warning-fg"
                  data-testid="broken-math-warning"
                  role="alert"
                >
                  Notasi terdeteksi rusak: {brokenIssues.join(", ")}. Gunakan tombol simbol di atas atau lihat panduan.
                </div>
              ) :
              null}
            <TeacherPreviewBlock text={previewText} testId="edit-question-preview" />
          </div>

          {editState._tag === "mcq_single" && (
            <McqSingleForm
              state={editState}
              isMatematika={isMatematika}
              onChange={(s) => setEditState(s)}
            />
          )}
          {editState._tag === "mcq_multi" && (
            <McqMultiForm
              state={editState}
              isMatematika={isMatematika}
              onChange={(s) => setEditState(s)}
            />
          )}
          {editState._tag === "true_false" && (
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
