import * as React from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { cn } from '../lib/utils.js'

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.round(bytes / 1024)} KB`
}

export interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  selectedFile?: { name: string; size: number } | null
  disabled?: boolean
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({ className, onFileSelect, onFileRemove, selectedFile, disabled, ...props }, ref) => {
    const [dragging, setDragging] = React.useState(false)
    const [error, setError] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    function validate(file: File): boolean {
      return file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024
    }

    function handleFile(file: File) {
      if (validate(file)) {
        setError(false)
        onFileSelect(file)
      } else {
        setError(true)
      }
    }

    function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setDragging(true)
        setError(false)
      }
    }

    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // reset input so same file can be re-selected
      e.target.value = ''
    }

    function handlePickFile() {
      inputRef.current?.click()
    }

    if (selectedFile) {
      return (
        <div
          ref={ref}
          className={cn(
            'border border-border-default rounded-md p-4 bg-bg-muted',
            'flex items-center gap-3',
            className,
          )}
          {...props}
        >
          <FileText size={20} className="text-text-tertiary shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-body font-medium text-text-primary truncate max-w-[200px]">
              {selectedFile.name}
            </span>
            <span className="text-caption text-text-tertiary">
              {formatFileSize(selectedFile.size)}
            </span>
          </div>
          {onFileRemove && (
            <button
              type="button"
              onClick={onFileRemove}
              className="shrink-0 p-1 rounded-sm text-text-tertiary hover:text-text-primary hover:bg-kertas-200 transition-colors duration-[120ms]"
              aria-label="Hapus file"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )
    }

    const containerClass = cn(
      'border-2 border-dashed rounded-md p-8 flex flex-col items-center text-center transition-colors duration-[120ms]',
      dragging
        ? 'border-border-focus bg-primary-50'
        : error
          ? 'border-danger-border bg-danger-bg'
          : 'border-border-ui',
      disabled && 'opacity-50 cursor-not-allowed',
      className,
    )

    return (
      <div
        ref={ref}
        className={containerClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...props}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          disabled={disabled}
          onChange={handleInputChange}
        />
        {error ? (
          <>
            <Upload size={24} className="text-danger-fg mb-3" />
            <p className="text-body text-danger-fg">
              Format tidak didukung atau ukuran melebihi 10MB
            </p>
            <button
              type="button"
              onClick={handlePickFile}
              disabled={disabled}
              className="mt-3 text-body-sm text-text-tertiary underline hover:text-text-primary disabled:cursor-not-allowed"
            >
              Coba lagi
            </button>
          </>
        ) : dragging ? (
          <>
            <Upload size={24} className="text-border-focus mb-3" />
            <p className="text-body font-medium text-text-secondary">
              Lepaskan untuk upload
            </p>
          </>
        ) : (
          <>
            <Upload size={24} className="text-text-tertiary mb-3" />
            <p className="text-body font-medium text-text-secondary">
              Drag &amp; drop PDF di sini
            </p>
            <p className="text-body-sm text-text-tertiary mt-1">atau</p>
            <button
              type="button"
              onClick={handlePickFile}
              disabled={disabled}
              className="mt-2 h-8 px-3 text-sm font-semibold rounded-sm border border-border-ui bg-transparent text-text-primary hover:bg-kertas-100 transition-colors duration-[120ms] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              Pilih file
            </button>
            <p className="text-caption text-text-tertiary mt-3">
              Format: PDF • Maks 10MB
            </p>
          </>
        )}
      </div>
    )
  },
)
FileUpload.displayName = 'FileUpload'
