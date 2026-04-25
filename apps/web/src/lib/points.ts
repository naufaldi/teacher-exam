export function pointsPerQuestion(totalSoal: number): number {
  return Math.max(1, Math.round(100 / totalSoal))
}
