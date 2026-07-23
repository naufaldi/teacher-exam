export interface TeacherFeedbackConfig {
  enabled: boolean
  formUrl: string | null
}

export function parseTeacherFeedbackConfig(
  env: Record<string, string | undefined>
): TeacherFeedbackConfig {
  if (env["VITE_TEACHER_FEEDBACK_ENABLED"] !== "true") {
    return { enabled: false, formUrl: null }
  }
  const rawUrl = env["VITE_FEEDBACK_FORM_URL"]
  if (rawUrl === undefined) return { enabled: false, formUrl: null }
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== "https:") return { enabled: false, formUrl: null }
    return { enabled: true, formUrl: url.toString().replace(/\/$/, "") }
  } catch {
    return { enabled: false, formUrl: null }
  }
}

export const teacherFeedbackConfig = parseTeacherFeedbackConfig({
  VITE_TEACHER_FEEDBACK_ENABLED: import.meta.env["VITE_TEACHER_FEEDBACK_ENABLED"],
  VITE_FEEDBACK_FORM_URL: import.meta.env["VITE_FEEDBACK_FORM_URL"]
})
