import type { Exam } from "@teacher-exam/shared"
import { formatExamTitle, resolveExamSubjectLabel } from "@teacher-exam/shared"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@teacher-exam/ui"

interface DuplicateConfirmDialogProps {
  exam: Exam
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

export function DuplicateConfirmDialog({
  exam,
  isPending,
  onConfirm,
  onOpenChange,
  open
}: DuplicateConfirmDialogProps) {
  const subjectLabel = resolveExamSubjectLabel({
    subject: exam.subject,
    subjectLabel: exam.subjectLabel
  })
  const derivedTitle = formatExamTitle({
    subjectLabel,
    grade: exam.grade,
    examType: exam.examType,
    examDate: exam.examDate,
    topics: exam.topics
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplikat Lembar</DialogTitle>
          <DialogDescription>Lembar baru akan dibuat sebagai draft.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="font-semibold text-text-primary">{derivedTitle}</p>
          <p className="text-sm text-text-secondary">
            {subjectLabel} · Kelas {exam.grade}
          </p>
          <p className="text-sm text-text-tertiary">{exam.topics.join(", ")}</p>
          <Badge variant={exam.status === "final" ? "success" : "warning"}>
            {exam.status === "final" ? "Final" : "Draft"}
          </Badge>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Menduplikat…" : "Duplikat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
