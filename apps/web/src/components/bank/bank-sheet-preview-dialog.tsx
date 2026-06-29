import type { ExamWithQuestions } from "@teacher-exam/shared"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  LoadingSpinner
} from "@teacher-exam/ui"
import { useEffect, useState } from "react"
import { BankQuestionReadonlyBody } from "./bank-question-readonly-body.js"
import { api, unwrapApiEither } from "../../lib/api.js"

interface BankSheetPreviewDialogProps {
  examId: string | null
  title?: string
  open: boolean
  onClose: () => void
}

function BankSheetPreviewDialog({ examId, onClose, open, title }: BankSheetPreviewDialogProps) {
  const [exam, setExam] = useState<ExamWithQuestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !examId) {
      setExam(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    void api.exams
      .get(examId)
      .then((result) => {
        const response = unwrapApiEither(result)
        setExam(response)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Gagal memuat lembar")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, examId])

  const acceptedQuestions = exam?.questions.filter((q) => q.status === "accepted") ?? []

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? exam?.title ?? "Pratinjau lembar"}</DialogTitle>
        </DialogHeader>
        {loading ?
          (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) :
          null}
        {!loading && error ?
          <p className="text-body-sm text-danger-700">{error}</p> :
          null}
        {!loading && !error ?
          (
            <div className="space-y-6">
              {acceptedQuestions.map((question) => (
                <div key={question.id} className="rounded-md border border-border-default p-4">
                  <p className="text-caption font-semibold text-text-tertiary mb-2">
                    Soal {question.number}
                  </p>
                  <BankQuestionReadonlyBody question={question} />
                </div>
              ))}
            </div>
          ) :
          null}
      </DialogContent>
    </Dialog>
  )
}

export { BankSheetPreviewDialog }
