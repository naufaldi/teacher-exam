import { AlertTriangle, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@teacher-exam/ui'

export interface GenerateErrorDialogProps {
  open: boolean
  onRetry: () => void
  onClose: () => void
  message?: string
}

/**
 * Dialog shown when the (simulated) AI generation fails.
 * Offers a retry path that re-runs the generation and a close path that returns to the form.
 */
export function GenerateErrorDialog({
  open,
  onRetry,
  onClose,
  message,
}: GenerateErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center">
              <AlertTriangle className="text-danger-fg" size={18} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-h3">AI gagal merespons</DialogTitle>
              <DialogDescription className="text-body-sm">
                {message ??
                  'Permintaan generate timeout atau melebihi batas penggunaan. Silakan coba lagi dalam beberapa saat.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-sm bg-bg-muted border border-border-default p-3 text-caption text-text-secondary">
          <p className="font-medium text-text-primary mb-1">Beberapa hal yang bisa dicoba:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Periksa koneksi internet Anda</li>
            <li>Coba lagi dalam 1–2 menit (rate limit AI)</li>
            <li>Sederhanakan topik atau kurangi panjang contoh soal</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba lagi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
