/** Indonesian time-of-day greeting suffix based on the current hour. */
export function getGreetingTime(): string {
  const h = new Date().getHours()
  if (h < 11) return "pagi"
  if (h < 15) return "siang"
  if (h < 18) return "sore"
  return "malam"
}

/** Formats an ISO date string as a long Indonesian date (e.g. "5 Juli 2026"). */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}

/** Long Indonesian date for today, including the weekday. */
export function formatTodayLong(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}
