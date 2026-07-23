import { useNavigate } from "@tanstack/react-router"
import type { ExamWithQuestions } from "@teacher-exam/shared"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingSpinner
} from "@teacher-exam/ui"
import { useEffect, useState } from "react"
import { api, unwrapApiEither } from "../../lib/api.js"
import { BankQuestionReadonlyBody } from "../bank/bank-question-readonly-body.js"

interface SheetPreviewDialogProps {
  examId: string | null
  title?: string
  open: boolean
  onClose: () => void
  showPrintFooter?: boolean
}

function SheetPreviewDialog({
  examId,
  onClose,
  open,
  showPrintFooter = true,
  title
}: SheetPreviewDialogProps) {
  const navigate = useNavigate()
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

  function handleOpenPrintPage() {
    if (!examId) return
    onClose()
    void navigate({ to: "/preview", search: { examId } })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>{title ?? exam?.title ?? "Pratinjau lembar"}</DialogTitle>
          <DialogDescription className="sr-only">
            Pratinjau soal yang sudah diterima.
          </DialogDescription>
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
        {!loading && !error && acceptedQuestions.length === 0 ?
          (
            <p className="text-body-sm text-text-tertiary py-8 text-center">
              Belum ada soal diterima.
            </p>
          ) :
          null}
        {!loading && !error && acceptedQuestions.length > 0 ?
          (
            <div className="space-y-6 flex-1 overflow-y-auto">
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
        <DialogFooter className="gap-2 sm:gap-2 pt-4 border-t border-border-default mt-4">
          <Button variant="secondary" size="md" onClick={onClose}>
            Tutup
          </Button>
          {showPrintFooter && examId ?
            (
              <Button variant="primary" size="md" onClick={handleOpenPrintPage}>
                Buka halaman cetak
              </Button>
            ) :
            null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { SheetPreviewDialog }
