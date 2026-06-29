import type { CurriculumTipsResponse } from "@teacher-exam/shared"
import { CheckCircle } from "lucide-react"

interface CurriculumTipsCardProps {
  tips: CurriculumTipsResponse
}

function CurriculumTipsCard({ tips }: CurriculumTipsCardProps) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-md p-6 flex flex-col overflow-hidden h-full">
      <span className="text-caption font-semibold tracking-wider uppercase text-secondary-700">
        Capaian Pembelajaran · Fase {tips.phase}
      </span>
      <h3 className="text-h3 font-semibold text-text-primary mt-2 mb-2.5">{tips.title}</h3>
      <p className="text-body-sm text-text-secondary leading-relaxed m-0">{tips.intro}</p>

      <ul className="mt-4 flex flex-col gap-2.5 list-none p-0 m-0">
        {tips.elements.map((cp, i) => (
          <li
            key={`${cp.label}-${i}`}
            className="grid gap-2.5 items-start text-body-sm leading-snug"
            style={{ gridTemplateColumns: "24px 1fr" }}
          >
            <span
              className="w-6 h-6 rounded-full bg-secondary-50 text-secondary-700 text-caption font-semibold flex items-center justify-center shrink-0"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {i + 1}
            </span>
            <span>
              <b className="font-semibold text-text-primary">{cp.label}</b>{" "}
              <span className="text-text-secondary">{cp.description}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5 border-t border-dashed border-border-default flex items-center gap-1.5 text-caption text-text-tertiary">
        <CheckCircle size={14} className="text-secondary-700 shrink-0" />
        {tips.footer}
      </div>
    </div>
  )
}

export { CurriculumTipsCard }
