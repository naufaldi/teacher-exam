import { XCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@teacher-exam/ui'

export interface RejectConfirmDialogProps {
  open: boolean
  questionNumber: number | null
  onConfirm: () => void
  onClose: () => void
}

/**
 * Slow Track confirmation: tolak a soal triggers an AI re-generate of that single item.
 */
export function RejectConfirmDialog({
  open,
  questionNumber,
  onConfirm,
  onClose,
}: RejectConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center">
              <XCircle className="text-danger-fg" size={18} />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle>
                Tolak {questionNumber !== null ? `Soal #${questionNumber}` : 'soal ini'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                AI akan langsung membuat soal pengganti dengan topik dan tingkat kesulitan yang sama.
                Proses ini biasanya memakan waktu 1–2 detik.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-danger-solid hover:bg-danger-solid/90 text-white"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Tolak & ganti
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
