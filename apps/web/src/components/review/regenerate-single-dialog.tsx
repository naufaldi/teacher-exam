import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Textarea,
} from '@teacher-exam/ui'

export interface RegenerateSingleDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (hint?: string) => void
}

export function RegenerateSingleDialog({
  open,
  onOpenChange,
  onConfirm,
}: RegenerateSingleDialogProps) {
  const [hint, setHint] = useState('')

  const handleConfirm = () => {
    const trimmed = hint.trim()
    onConfirm(trimmed.length > 0 ? trimmed : undefined)
    setHint('')
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) setHint('')
    onOpenChange(v)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Ganti soal dengan AI?</AlertDialogTitle>
          <AlertDialogDescription>
            Soal ini akan digantikan dengan soal baru yang dihasilkan AI.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Ingin soal seperti apa? (opsional)"
          rows={3}
          className="mt-2"
        />

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleOpenChange(false)}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Ganti
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
