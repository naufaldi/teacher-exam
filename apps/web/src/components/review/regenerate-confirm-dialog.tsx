import { RefreshCw, AlertTriangle } from 'lucide-react'
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

export interface RegenerateConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onClose: () => void
  acceptedCount?: number
}

/**
 * Confirms a destructive regenerate of the entire 20-soal package.
 * Surfaces how many already-accepted/edited items will be lost.
 */
export function RegenerateConfirmDialog({
  open,
  onConfirm,
  onClose,
  acceptedCount,
}: RegenerateConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-warning-bg border border-warning-border flex items-center justify-center">
              <AlertTriangle className="text-warning-fg" size={18} />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle>Regenerate seluruh paket?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua soal pada lembar ini akan dibuang dan AI akan membuat paket baru
                dengan konfigurasi yang sama.
                {typeof acceptedCount === 'number' && acceptedCount > 0 ? (
                  <>
                    {' '}
                    <span className="text-text-primary font-medium">
                      {acceptedCount} soal yang sudah diterima/diedit akan hilang.
                    </span>
                  </>
                ) : null}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate paket
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
