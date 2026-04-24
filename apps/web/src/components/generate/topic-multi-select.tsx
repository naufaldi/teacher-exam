import { useState } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@teacher-exam/ui'

interface TopicMultiSelectProps {
  options: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
  onCustom?: () => void
  maxItems?: number
  placeholder?: string
}

export function TopicMultiSelect({
  options,
  selected,
  onChange,
  onCustom,
  maxItems = 5,
  placeholder = 'Pilih topik...',
}: TopicMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else if (selected.length < maxItems) {
      onChange([...selected, option])
    }
  }

  const remove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((s) => s !== option))
  }

  const isAtMax = selected.length >= maxItems

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={[
            'w-full min-h-[40px] px-3 py-2 rounded-sm border text-left',
            'flex flex-wrap gap-1.5 items-center',
            'bg-bg-surface border-border-ui',
            'hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400',
            'transition-colors duration-[120ms]',
          ].join(' ')}
        >
          {selected.length === 0 ? (
            <span className="text-text-tertiary text-sm flex-1">{placeholder}</span>
          ) : (
            selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 border border-primary-200 rounded-pill px-2 py-0.5 text-caption"
              >
                {s}
                <button
                  type="button"
                  onClick={(e) => remove(s, e)}
                  aria-label={`Hapus topik: ${s}`}
                  className="hover:text-primary-900"
                >
                  <X size={10} />
                </button>
              </span>
            ))
          )}
          <ChevronDown size={16} className="ml-auto shrink-0 text-text-tertiary" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto"
        align="start"
      >
        <ul role="listbox" aria-multiselectable="true" className="py-1">
          {options.map((option) => {
            const checked = selected.includes(option)
            const disabled = !checked && isAtMax
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  disabled={disabled}
                  onClick={() => toggle(option)}
                  className={[
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                    'transition-colors duration-[80ms]',
                    disabled
                      ? 'text-text-tertiary cursor-not-allowed opacity-50'
                      : 'hover:bg-kertas-100 cursor-pointer',
                    checked ? 'text-primary-700 font-medium' : 'text-text-primary',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0',
                      checked
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-border-ui bg-bg-surface',
                    ].join(' ')}
                  >
                    {checked ? <Check size={10} className="text-white" /> : null}
                  </span>
                  {option}
                </button>
              </li>
            )
          })}

          {onCustom ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onCustom()
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-secondary hover:bg-kertas-100 cursor-pointer border-t border-border-default mt-1"
              >
                Lainnya (ketik sendiri)...
              </button>
            </li>
          ) : null}
        </ul>

        {isAtMax ? (
          <p className="text-caption text-text-tertiary px-3 py-2 border-t border-border-default">
            Maksimal {maxItems} topik dipilih.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
