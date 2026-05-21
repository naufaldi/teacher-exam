const STRING_FIELD_KEYS = ['option_a', 'option_b', 'option_c', 'option_d', 'text', 'topic', 'label'] as const

const UNQUOTED_RP_PATTERN = new RegExp(
  `("(?:${STRING_FIELD_KEYS.join('|')})":\\s*)(Rp[\\d.,]+)(?=\\s*[,}\\]])`,
  'g',
)

/**
 * Best-effort fix for common LLM JSON mistakes (unquoted Rupiah string values).
 */
export function repairAiJson(raw: string): string {
  return raw.replace(UNQUOTED_RP_PATTERN, '$1"$2"')
}

/**
 * Parse AI JSON array output; repair once on syntax failure.
 */
export function parseAiJsonArray(raw: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('AI returned non-array JSON')
    }
    return parsed
  } catch (firstError) {
    const repaired = repairAiJson(raw)
    if (repaired === raw) {
      throw firstError
    }
    try {
      const parsed: unknown = JSON.parse(repaired)
      if (!Array.isArray(parsed)) {
        throw new Error('AI returned non-array JSON')
      }
      return parsed
    } catch {
      throw firstError
    }
  }
}
