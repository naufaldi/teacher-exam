import { useState } from 'react'
import type { SaveToBankInput } from '@teacher-exam/shared'
import { Badge, Button, LoadingSpinner } from '@teacher-exam/ui'
import { api, unwrapApiEither } from '../../lib/api.js'

interface SaveToBankButtonProps {
  questionId: SaveToBankInput['questionId']
  assumeSaved?: boolean
}

function SaveToBankButton({ questionId, assumeSaved = false }: SaveToBankButtonProps) {
  const [saved, setSaved] = useState(assumeSaved)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (saved) {
    return (
      <Badge variant="secondary" className="shrink-0">
        Tersimpan
      </Badge>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={loading}
        onClick={() => {
          setLoading(true)
          setError(null)
          void api.bank
            .save({ questionId })
            .then((result) => {
              unwrapApiEither(result)
              setSaved(true)
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'Gagal menyimpan')
            })
            .finally(() => {
              setLoading(false)
            })
        }}
      >
        {loading ? <LoadingSpinner className="h-4 w-4" /> : 'Simpan ke Bank'}
      </Button>
      {error ? <span className="text-caption text-danger-fg">{error}</span> : null}
    </div>
  )
}

export { SaveToBankButton }
