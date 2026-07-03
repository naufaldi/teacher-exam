import { Separator } from "@teacher-exam/ui"

export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-caption font-semibold tracking-wider uppercase text-text-tertiary whitespace-nowrap">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  )
}
