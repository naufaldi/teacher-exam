import { ArrowLeftRight } from 'lucide-react'
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

export interface SwitchModeDialogProps {
  open: boolean
  targetMode: 'fast' | 'slow'
  onConfirm: () => void
  onClose: () => void
}

const LABELS: Record<'fast' | 'slow', { name: string; desc: string }> = {
  fast: {
    name: 'Cepat',
    desc: 'Semua soal akan auto-diterima dan Anda langsung ke layar konfirmasi paket.',
  },
  slow: {
    name: 'Detail',
    desc: 'Anda dapat me-review dan mengubah setiap soal satu per satu.',
  },
}

/**
 * Confirms a switch between Fast Track and Slow Track when dirty state exists.
 */
export function SwitchModeDialog({
  open,
  targetMode,
  onConfirm,
  onClose,
}: SwitchModeDialogProps) {
  const target = LABELS[targetMode]

  return (
    <AlertDialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
              <ArrowLeftRight className="text-primary-700" size={18} />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle>
                Pindah ke Mode {target.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {target.desc}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="rounded-sm bg-bg-muted border border-border-default p-3 text-caption text-text-secondary">
          Status terima/tolak/edit yang sudah Anda set akan tetap dipertahankan.
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Pindah ke Mode {target.name}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
