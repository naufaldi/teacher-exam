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

export interface RegenerateBatchDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  count: number
}

export function RegenerateBatchDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
}: RegenerateBatchDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Ganti {count} soal ditolak dengan AI?</AlertDialogTitle>
          <AlertDialogDescription>
            Setiap soal yang ditolak akan digantikan dengan soal baru yang dihasilkan AI secara
            bersamaan. Soal yang berhasil diganti akan berstatus pending.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Ganti semua</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
