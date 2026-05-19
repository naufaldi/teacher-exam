import type { ValidationStatus } from '@teacher-exam/shared'
import { Badge } from '@teacher-exam/ui'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

const LABEL: Record<ValidationStatus, string> = {
  valid: 'Sesuai',
  needs_review: 'Perlu review',
  invalid: 'Tidak sesuai',
}

const VARIANT: Record<ValidationStatus, 'success' | 'warning' | 'danger'> = {
  valid: 'success',
  needs_review: 'warning',
  invalid: 'danger',
}

const ICON: Record<ValidationStatus, typeof CheckCircle2> = {
  valid: CheckCircle2,
  needs_review: AlertTriangle,
  invalid: XCircle,
}

export interface CurriculumValidationBadgeProps {
  status: ValidationStatus
  reason?: string | null
  compact?: boolean
}

export function CurriculumValidationBadge({
  status,
  reason,
  compact = false,
}: CurriculumValidationBadgeProps) {
  const Icon = ICON[status]
  const title = reason?.trim() ? reason : LABEL[status]

  return (
    <Badge
      variant={VARIANT[status]}
      className={compact ? 'text-caption shrink-0 gap-1' : 'text-caption gap-1'}
      title={title}
      data-testid={`curriculum-badge-${status}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {compact ? LABEL[status].split(' ')[0] : LABEL[status]}
    </Badge>
  )
}

export function needsCurriculumReview(status: ValidationStatus | null | undefined): boolean {
  return status === 'needs_review' || status === 'invalid'
}
