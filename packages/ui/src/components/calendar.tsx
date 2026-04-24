import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '../lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex items-center justify-center relative h-7',
        caption_label: 'text-sm font-semibold text-text-primary',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(
          'h-7 w-7 rounded-sm inline-flex items-center justify-center',
          'text-text-secondary hover:bg-kertas-100 hover:text-text-primary',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'transition-colors duration-[120ms]',
        ),
        button_next: cn(
          'h-7 w-7 rounded-sm inline-flex items-center justify-center',
          'text-text-secondary hover:bg-kertas-100 hover:text-text-primary',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'transition-colors duration-[120ms]',
        ),
        table: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'flex-1 h-8 flex items-center justify-center text-[0.75rem] font-normal text-text-secondary select-none',
        week: 'flex w-full mt-1',
        day: 'flex-1 flex items-center justify-center p-0 relative',
        day_button: cn(
          'h-8 w-8 rounded-sm p-0',
          'text-sm font-normal text-text-primary',
          'inline-flex items-center justify-center',
          'hover:bg-kertas-100',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[color:var(--color-border-focus)]/40',
          'transition-colors duration-[120ms]',
          'aria-disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent',
        ),
        selected:
          '[&>button]:bg-primary-500 [&>button]:text-text-on-primary [&>button]:hover:bg-primary-600',
        today: '[&>button]:bg-kertas-100 [&>button]:font-semibold',
        outside: '[&>button]:text-text-disabled [&>button]:opacity-40',
        disabled: '[&>button]:opacity-40 [&>button]:cursor-not-allowed',
        range_start: '[&>button]:bg-primary-500 [&>button]:text-text-on-primary [&>button]:rounded-r-none',
        range_middle:
          'bg-kertas-100 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:hover:bg-transparent',
        range_end: '[&>button]:bg-primary-500 [&>button]:text-text-on-primary [&>button]:rounded-l-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
