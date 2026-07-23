import type { ExamPilotReadiness } from "@teacher-exam/shared"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@teacher-exam/ui"
import { Check, LoaderCircle } from "lucide-react"
import { useEffect, useState } from "react"

const choices: ReadonlyArray<{
  value: ExamPilotReadiness
  label: string
  description: string
}> = [
  {
    value: "ready",
    label: "Ya, siap digunakan",
    description: "Bisa langsung dipakai"
  },
  {
    value: "ready_after_edit",
    label: "Ya, setelah diedit",
    description: "Perlu sedikit perbaikan"
  },
  {
    value: "not_ready",
    label: "Belum",
    description: "Belum bisa dipakai"
  }
]

interface ExamReadinessDialogProps {
  open: boolean
  formUrl: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (readiness: ExamPilotReadiness) => Promise<void>
}

export function ExamReadinessDialog({
  formUrl,
  onOpenChange,
  onSubmit,
  open
}: ExamReadinessDialogProps) {
  const [selected, setSelected] = useState<ExamPilotReadiness | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  useEffect(() => {
    if (open) return
    setSelected(null)
    setSubmitting(false)
    setFailed(false)
    setSucceeded(false)
  }, [open])

  const submit = async (readiness: ExamPilotReadiness) => {
    if (submitting) return
    setSelected(readiness)
    setSubmitting(true)
    setFailed(false)
    try {
      await onSubmit(readiness)
      setSucceeded(true)
    } catch {
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-no-print
        className="max-w-md motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100"
      >
        <div
          data-testid="readiness-dialog-state"
          className="transition-opacity duration-[140ms] motion-reduce:transition-none"
        >
          {succeeded ?
            (
              <div className="flex flex-col items-center py-3 text-center animate-in fade-in-0 duration-[140ms] motion-reduce:animate-none">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success-fg">
                  <Check className="h-5 w-5" aria-hidden />
                </div>
                <DialogTitle className="text-h3">
                  Terima kasih, masukan Anda sudah tersimpan
                </DialogTitle>
                {formUrl !== null ?
                  (
                    <a
                      href={formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 text-body-sm font-medium text-primary-700 underline underline-offset-2"
                    >
                      Ceritakan lebih lanjut
                    </a>
                  ) :
                  null}
                <Button className="mt-6" onClick={() => onOpenChange(false)}>
                  Selesai
                </Button>
              </div>
            ) :
            (
              <div className="animate-in fade-in-0 duration-[140ms] motion-reduce:animate-none">
                <DialogHeader>
                  <DialogTitle>Apakah lembar ini siap digunakan?</DialogTitle>
                  <DialogDescription>
                    Jawaban singkat membantu kami memperbaiki kualitas Generate Soal.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  {choices.map((choice) => {
                    const isLoading = submitting && selected === choice.value
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        disabled={submitting}
                        aria-busy={isLoading}
                        onClick={() => void submit(choice.value)}
                        className={[
                          "flex min-h-14 w-full items-center justify-between rounded-md border px-4 py-3 text-left",
                          "border-border-default bg-bg-surface",
                          "transition-[border-color,background-color,color,transform] duration-[140ms]",
                          "hover:border-kertas-400 hover:bg-kertas-50 active:scale-[0.98]",
                          "focus-visible:outline-none focus-visible:ring-3",
                          "focus-visible:ring-[color:var(--color-border-focus)]/40",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          "motion-reduce:transform-none motion-reduce:transition-none",
                          failed && selected === choice.value ? "border-danger-300 bg-danger-50" : ""
                        ].join(" ")}
                      >
                        <span>
                          <span className="block text-body-sm font-semibold text-text-primary">
                            {choice.label}
                          </span>
                          <span className="block text-caption text-text-secondary">
                            {choice.description}
                          </span>
                        </span>
                        {isLoading ?
                          (
                            <span className="ml-3 inline-flex items-center gap-1.5 text-caption text-text-secondary">
                              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                              Menyimpan...
                            </span>
                          ) :
                          null}
                      </button>
                    )
                  })}
                </div>

                {failed ?
                  (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-sm bg-danger-50 px-3 py-2">
                      <p className="text-caption text-danger-700">Masukan belum tersimpan.</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selected !== null && void submit(selected)}
                      >
                        Coba lagi
                      </Button>
                    </div>
                  ) :
                  null}

                <DialogFooter>
                  <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                    Nanti saja
                  </Button>
                </DialogFooter>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
