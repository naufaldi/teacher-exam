import type { ValidationStatus } from "@teacher-exam/shared"

const STATUS_RANK: Record<ValidationStatus, number> = {
  valid: 0,
  needs_review: 1,
  invalid: 2
}

function pickWorstStatus(a: ValidationStatus, b: ValidationStatus): ValidationStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b
}

function combineReasons(existing: string | null, incoming: string): string {
  const parts = [existing, incoming]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0))
  return [...new Set(parts)].join("\n")
}

export function mergeValidationStatus(
  structural: { status: ValidationStatus | null; reason: string | null },
  curriculum: { status: ValidationStatus; reason: string }
): { validationStatus: ValidationStatus; validationReason: string } {
  const baseStatus = structural.status ?? "valid"
  const validationStatus = pickWorstStatus(baseStatus, curriculum.status)
  const validationReason = combineReasons(structural.reason, curriculum.reason)
  return { validationStatus, validationReason }
}

export function validationFailureFallback(cause: string): {
  validationStatus: ValidationStatus
  validationReason: string
} {
  return {
    validationStatus: "needs_review",
    validationReason: `Validasi kurikulum gagal: ${cause}`
  }
}
