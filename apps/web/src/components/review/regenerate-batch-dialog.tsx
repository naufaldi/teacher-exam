import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@teacher-exam/ui"

export interface RegenerateBatchDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  count: number
}

export function RegenerateBatchDialog({
  count,
  onConfirm,
  onOpenChange,
  open
}: RegenerateBatchDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Coba lagi {count} regenerate yang gagal?</AlertDialogTitle>
          <AlertDialogDescription>
            Setiap soal yang gagal akan dicoba ulang dengan petunjuk yang sama. Soal yang berhasil diganti akan kembali
            ke status pending dan ditandai sebagai &ldquo;Soal baru&rdquo;.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Coba lagi semua</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
