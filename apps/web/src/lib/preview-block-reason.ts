export interface PreviewMetadataFields {
  schoolName: string
  academicYear: string
  examType: string
  examDate: string
  durationMinutes: number
}

function missingLabels(fields: PreviewMetadataFields): Array<string> {
  const missing: Array<string> = []
  if (fields.schoolName.trim().length === 0) missing.push("nama sekolah")
  if (fields.academicYear.trim().length === 0) missing.push("tahun pelajaran")
  if (fields.examType.trim().length === 0) missing.push("jenis ujian")
  if (fields.examDate.trim().length === 0) missing.push("tanggal ujian")
  if (!(fields.durationMinutes > 0)) missing.push("durasi")
  return missing
}

/** Sentence shown beside a disabled Preview Lembar button when header fields are empty. */
export function previewMetadataBlockReason(fields: PreviewMetadataFields): string | null {
  const missing = missingLabels(fields)
  const first = missing[0]
  if (missing.length === 0 || first === undefined) return null
  if (missing.length === 1) return `Lengkapi ${first}.`
  const second = missing[1]
  if (missing.length === 2 && second !== undefined) return `Lengkapi ${first} dan ${second}.`
  const last = missing[missing.length - 1]
  if (last === undefined) return `Lengkapi ${first}.`
  return `Lengkapi ${missing.slice(0, -1).join(", ")}, dan ${last}.`
}
