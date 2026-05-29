import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Textarea
} from "@teacher-exam/ui"
import { XCircle } from "lucide-react"
import { useEffect, useState } from "react"

export interface TolakRegenerateDialogProps {
  open: boolean
  questionNumber: number | null
  initialHint?: string
  onConfirm: (hint?: string) => void
  onClose: () => void
}

export function TolakRegenerateDialog({
  initialHint,
  onClose,
  onConfirm,
  open,
  questionNumber
}: TolakRegenerateDialogProps) {
  const [hint, setHint] = useState(initialHint ?? "")

  useEffect(() => {
    if (open) setHint(initialHint ?? "")
  }, [open, initialHint])

  const handleConfirm = () => {
    const trimmed = hint.trim()
    onConfirm(trimmed.length > 0 ? trimmed : undefined)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center">
              <XCircle className="text-danger-fg" size={18} />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle>
                Tolak {questionNumber !== null ? `Soal #${questionNumber}` : "soal ini"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                AI akan langsung membuat soal pengganti dengan topik dan tingkat kesulitan yang sama. Berikan petunjuk
                di bawah jika ingin mengarahkan AI.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <Textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Petunjuk untuk AI (opsional) — mis. 'terlalu sulit', 'topik kurang pas'"
          rows={3}
          className="mt-2"
        />

        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            autoFocus
            onClick={handleConfirm}
            className="bg-danger-solid hover:bg-danger-solid/90 text-white"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Ganti
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
