import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'

const INPUT_TRIGGER_CLASSES =
  'flex h-10 w-full rounded-xs border border-border-ui bg-bg-surface px-3 py-2' +
  ' text-body text-text-primary' +
  ' transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0.0,0.2,1)]' +
  ' focus-visible:outline-none' +
  ' focus-visible:ring-3 focus-visible:ring-[color:var(--color-border-focus)]/40 focus-visible:ring-offset-2' +
  ' disabled:opacity-45 disabled:cursor-not-allowed'

const idFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function formatDisplay(iso: string): string {
  return idFormatter.format(new Date(iso + 'T00:00:00'))
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface DatePickerProps {
  id?: string
  value: string
  onChange: (iso: string) => void
  onCommit?: (iso: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  onCommit,
  placeholder = 'Pilih tanggal',
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return
    const iso = isoFromDate(date)
    onChange(iso)
    onCommit?.(iso)
    setOpen(false)
  }

  const selected = value ? new Date(value + 'T00:00:00') : undefined

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(INPUT_TRIGGER_CLASSES, 'justify-between text-left cursor-pointer', className)}
        >
          <span className={value ? 'text-text-primary' : 'text-text-disabled'}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-text-secondary" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-bg-surface border-border-default rounded-sm shadow-md"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          weekStartsOn={1}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
