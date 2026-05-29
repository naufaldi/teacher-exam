import type { ValidationStatus } from "@teacher-exam/shared"
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@teacher-exam/ui"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

const LABEL: Record<ValidationStatus, string> = {
  valid: "Sesuai",
  needs_review: "Perlu review",
  invalid: "Tidak sesuai"
}

const VARIANT: Record<ValidationStatus, "success" | "warning" | "danger"> = {
  valid: "success",
  needs_review: "warning",
  invalid: "danger"
}

const ICON: Record<ValidationStatus, typeof CheckCircle2> = {
  valid: CheckCircle2,
  needs_review: AlertTriangle,
  invalid: XCircle
}

const STATUS_DESCRIPTION: Record<ValidationStatus, string> = {
  valid: "Soal sesuai kurikulum.",
  needs_review: "Soal perlu ditinjau ulang terhadap kurikulum.",
  invalid: "Soal tidak sesuai kurikulum."
}

export interface CurriculumValidationBadgeProps {
  status: ValidationStatus
  reason?: string | null
  compact?: boolean
}

export function CurriculumValidationBadge({
  compact = false,
  reason,
  status
}: CurriculumValidationBadgeProps) {
  const Icon = ICON[status]
  const tooltipBody = reason?.trim() ? reason : STATUS_DESCRIPTION[status]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={VARIANT[status]}
          className={compact ? "text-caption shrink-0 gap-1 cursor-default" : "text-caption gap-1 cursor-default"}
          data-testid={`curriculum-badge-${status}`}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {compact ? LABEL[status].split(" ")[0] : LABEL[status]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">Validasi kurikulum</p>
        <p className="text-white/90">{tooltipBody}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function needsCurriculumReview(status: ValidationStatus | null | undefined): boolean {
  return status === "needs_review" || status === "invalid"
}
