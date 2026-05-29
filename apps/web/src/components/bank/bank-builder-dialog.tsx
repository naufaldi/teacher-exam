import type { BuildExamFromBankMetadata, ExamSubject } from "@teacher-exam/shared"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea
} from "@teacher-exam/ui"
import { useState } from "react"

interface BankBuilderDialogProps {
  open: boolean
  selectedCount: number
  defaultSubject: ExamSubject
  defaultGrade: number
  loading: boolean
  onClose: () => void
  onSubmit: (metadata: BuildExamFromBankMetadata) => void
}

function BankBuilderDialog({
  defaultGrade,
  defaultSubject,
  loading,
  onClose,
  onSubmit,
  open,
  selectedCount
}: BankBuilderDialogProps) {
  const [schoolName, setSchoolName] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [examType, setExamType] = useState<BuildExamFromBankMetadata["examType"]>("latihan")
  const [examDate, setExamDate] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("60")
  const [instructions, setInstructions] = useState("")
  const [classContext, setClassContext] = useState("")

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat ujian dari bank</DialogTitle>
          <DialogDescription>
            {selectedCount} soal dipilih. Isi metadata ujian lalu lanjut ke pratinjau.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="builder-school">Nama sekolah</Label>
            <Input
              id="builder-school"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="builder-year">Tahun ajaran</Label>
            <Input
              id="builder-year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="builder-type">Jenis ujian</Label>
            <select
              id="builder-type"
              value={examType ?? "latihan"}
              onChange={(e) => setExamType(e.target.value as BuildExamFromBankMetadata["examType"])}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-body-sm"
            >
              <option value="latihan">Latihan</option>
              <option value="formatif">Formatif</option>
              <option value="sts">STS</option>
              <option value="sas">SAS</option>
              <option value="tka">TKA</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="builder-date">Tanggal ujian</Label>
            <Input
              id="builder-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="builder-duration">Durasi (menit)</Label>
            <Input
              id="builder-duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="builder-instructions">Instruksi</Label>
            <Textarea
              id="builder-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="builder-class">Konteks kelas (opsional)</Label>
            <Input
              id="builder-class"
              value={classContext}
              onChange={(e) => setClassContext(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={loading}
            onClick={() =>
              onSubmit({
                subject: defaultSubject,
                grade: defaultGrade,
                ...(schoolName.trim() ? { schoolName: schoolName.trim() } : {}),
                ...(academicYear.trim() ? { academicYear: academicYear.trim() } : {}),
                ...(examType ? { examType } : {}),
                ...(examDate ? { examDate } : {}),
                durationMinutes: Number(durationMinutes) || 60,
                ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
                ...(classContext.trim() ? { classContext: classContext.trim() } : {})
              })}
          >
            {loading ? "Membuat…" : "Buat ujian"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { BankBuilderDialog }
