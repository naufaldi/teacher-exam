import { Button, Popover, PopoverContent, PopoverTrigger } from "@teacher-exam/ui"
import { ChevronDown, FileText, FileType, Printer } from "lucide-react"
import { type ReactNode, useState } from "react"

type ExportFormat = "pdf" | "docx"

type ExportMenuProps = {
  /** Called when the teacher picks PDF or DOCX. Returns a promise so the menu can show a busy state. */
  onExport: (format: ExportFormat) => void | Promise<void>
  /** Called when the teacher picks "Cetak" (browser print dialog). */
  onPrint: () => void
  /** Optional label for the trigger button. */
  triggerLabel?: string
  disabled?: boolean
  variant?: "primary" | "secondary"
}

/**
 * Unduh dropdown: PDF (server-rendered) / DOCX (server-rendered) / Cetak (browser print).
 * Replaces the old `window.print()` "Unduh PDF" button across share + preview routes.
 */
export function ExportMenu({
  disabled = false,
  onExport,
  onPrint,
  triggerLabel = "Unduh",
  variant = "primary"
}: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const runExport = async (format: ExportFormat) => {
    setOpen(false)
    setBusy(true)
    try {
      await onExport(format)
    } finally {
      setBusy(false)
    }
  }

  const handlePrint = () => {
    setOpen(false)
    onPrint()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size="sm" disabled={disabled || busy} type="button">
          {busy ? "Mengekspor..." : triggerLabel}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <MenuItem icon={<FileText className="h-4 w-4" />} label="PDF" onSelect={() => void runExport("pdf")} />
        <MenuItem icon={<FileType className="h-4 w-4" />} label="DOCX" onSelect={() => void runExport("docx")} />
        <MenuItem icon={<Printer className="h-4 w-4" />} label="Cetak" onSelect={handlePrint} />
      </PopoverContent>
    </Popover>
  )
}

function MenuItem({ icon, label, onSelect }: { icon: ReactNode; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-text-primary hover:bg-kertas-100"
    >
      {icon}
      {label}
    </button>
  )
}
