import { MessageCircle } from "lucide-react"

function isSecureUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

export function TeacherFeedbackButton({ formUrl }: { formUrl: string }) {
  if (!isSecureUrl(formUrl)) return null

  return (
    <a
      href={formUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Beri Masukan"
      data-no-print
      className={[
        "fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-pill",
        "border border-border-default bg-bg-surface px-4 py-2.5 shadow-md",
        "text-body-sm font-semibold text-text-primary",
        "transition-[transform,border-color,background-color,box-shadow] duration-[140ms]",
        "active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-3",
        "focus-visible:ring-[color:var(--color-border-focus)]/40 focus-visible:ring-offset-2",
        "[@media(hover:hover)]:hover:-translate-y-0.5",
        "[@media(hover:hover)]:hover:border-kertas-300 [@media(hover:hover)]:hover:bg-kertas-50",
        "[@media(hover:hover)]:hover:shadow-lg",
        "motion-reduce:transform-none motion-reduce:transition-none"
      ].join(" ")}
    >
      <MessageCircle className="h-4 w-4 text-primary-600" aria-hidden />
      <span>Beri Masukan</span>
    </a>
  )
}
