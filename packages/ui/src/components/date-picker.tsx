import { CalendarIcon } from "lucide-react"
import * as React from "react"
import { cn } from "../lib/utils"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const INPUT_TRIGGER_CLASSES = "flex h-10 w-full rounded-xs border border-border-ui bg-bg-surface px-3 py-2" +
  " text-body text-text-primary" +
  " transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0.0,0.2,1)]" +
  " focus-visible:outline-none" +
  " focus-visible:ring-3 focus-visible:ring-[color:var(--color-border-focus)]/40 focus-visible:ring-offset-2" +
  " disabled:opacity-45 disabled:cursor-not-allowed"

const ID_MONTHS: Readonly<Record<string, number>> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11
}

const idFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric"
})

function dateFromExamValue(value: string): Date | undefined {
  const trimmed = value.trim()
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoDay?.[1] !== undefined && isoDay[2] !== undefined && isoDay[3] !== undefined) {
    const date = new Date(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]))
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  const long = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed)
  if (long?.[1] === undefined || long[2] === undefined || long[3] === undefined) return undefined
  const month = ID_MONTHS[long[2].toLowerCase()]
  if (month === undefined) return undefined
  const year = Number(long[3])
  const day = Number(long[1])
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return undefined
  return date
}

function formatDisplay(value: string): string {
  const date = dateFromExamValue(value)
  if (!date) return value
  return idFormatter.format(date)
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
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
  className,
  disabled = false,
  id,
  onChange,
  onCommit,
  placeholder = "Pilih tanggal",
  value
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

  const selected = value ? dateFromExamValue(value) : undefined

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(INPUT_TRIGGER_CLASSES, "justify-between text-left cursor-pointer", className)}
        >
          <span className={value ? "text-text-primary" : "text-text-disabled"}>
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
