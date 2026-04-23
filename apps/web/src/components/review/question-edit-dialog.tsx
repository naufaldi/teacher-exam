import { useEffect, useState } from 'react'
import type { Question } from '@teacher-exam/shared'
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

export interface QuestionEditDialogProps {
  open: boolean
  question: Question | null
  onClose: () => void
  onSave: (updated: Question) => void
}

const LETTERS = ['a', 'b', 'c', 'd'] as const

/**
 * Modal for editing a single soal — text, four options, correct answer.
 * Used by both Fast Track ("Edit cepat") and Slow Track ("Edit") flows.
 */
export function QuestionEditDialog({
  open,
  question,
  onClose,
  onSave,
}: QuestionEditDialogProps) {
  const [text, setText] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correct, setCorrect] = useState<'a' | 'b' | 'c' | 'd'>('a')

  useEffect(() => {
    if (question === null) return
    setText(question.text)
    setOptionA(question.optionA)
    setOptionB(question.optionB)
    setOptionC(question.optionC)
    setOptionD(question.optionD)
    setCorrect(question.correctAnswer)
  }, [question])

  if (question === null) return null

  const optionSetters: Record<typeof LETTERS[number], (v: string) => void> = {
    a: setOptionA,
    b: setOptionB,
    c: setOptionC,
    d: setOptionD,
  }
  const optionValues: Record<typeof LETTERS[number], string> = {
    a: optionA,
    b: optionB,
    c: optionC,
    d: optionD,
  }

  const isValid = text.trim() !== '' && LETTERS.every((l) => optionValues[l].trim() !== '')

  const handleSave = () => {
    if (!isValid) return
    onSave({
      ...question,
      text: text.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      correctAnswer: correct,
    })
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Pilihan jawaban</Label>
            <RadioGroup value={correct} onValueChange={(v) => setCorrect(v as 'a' | 'b' | 'c' | 'd')}>
              <div className="space-y-2">
                {LETTERS.map((letter) => {
                  const isCorrect = correct === letter
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
                        value={optionValues[letter]}
                        onChange={(e) => optionSetters[letter](e.target.value)}
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
                {correct.toUpperCase()}
              </span>
            </p>
          </div>
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
