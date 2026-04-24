const formatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatIndonesianDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00')
  return formatter.format(date)
}
