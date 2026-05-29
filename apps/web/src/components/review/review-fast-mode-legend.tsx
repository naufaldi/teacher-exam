import { Badge } from "@teacher-exam/ui"
import { CheckCircle2 } from "lucide-react"

export function ReviewFastModeLegend() {
  return (
    <div
      className="rounded-sm border border-info-border bg-info-bg px-4 py-3 text-body-sm text-info-fg"
      data-testid="fast-mode-legend"
    >
      <p className="font-medium mb-2">Keterangan badge</p>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-caption">
        <li className="inline-flex items-center gap-2">
          <Badge variant="success" className="text-caption gap-1 shrink-0">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Sesuai
          </Badge>
          <span>Hasil cek kurikulum otomatis (Penjaga Kurikulum)</span>
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="font-mono text-caption bg-bg-muted px-1.5 py-0.5 rounded-xs shrink-0">
            Kunci A
          </span>
          <span>Jawaban benar soal ini</span>
        </li>
        <li className="inline-flex items-center gap-2">
          <Badge variant="secondary" className="text-caption shrink-0">
            Topik
          </Badge>
          <span>Materi/kompetensi yang diuji</span>
        </li>
      </ul>
    </div>
  )
}
