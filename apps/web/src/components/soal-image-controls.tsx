import { Button } from "@teacher-exam/ui"
import type { ChangeEvent } from "react"

type SoalImageControlsProps = {
  busy: boolean
  hasImage: boolean
  onDrawSvg: () => void
  onDrawModel: () => void
  onUpload: (file: File) => void
  onRemove: () => void
}

export function SoalImageControls({
  busy,
  hasImage,
  onDrawModel,
  onDrawSvg,
  onRemove,
  onUpload
}: SoalImageControlsProps) {
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) onUpload(file)
  }
  return (
    <div className="flex flex-wrap gap-2" data-no-print>
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onDrawSvg}>
        Gambar SVG
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onDrawModel}>
        Gambar model
      </Button>
      <label className="inline-flex">
        <span className="sr-only">Unggah gambar</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="text-caption text-text-secondary"
          disabled={busy}
          onChange={onFile}
        />
      </label>
      {hasImage ?
        (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}>
            Hapus gambar
          </Button>
        ) :
        null}
    </div>
  )
}
