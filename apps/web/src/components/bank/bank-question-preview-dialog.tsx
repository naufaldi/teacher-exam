import type { BankQuestion, PublicBankQuestion } from "@teacher-exam/shared"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@teacher-exam/ui"
import { QuestionMetaBadges } from "../shared/question-meta-badges.js"
import { BankQuestionReadonlyBody } from "./bank-question-readonly-body.js"

interface BankQuestionPreviewDialogProps {
  item: BankQuestion | PublicBankQuestion | null
  open: boolean
  onClose: () => void
}

function BankQuestionPreviewDialog({ item, onClose, open }: BankQuestionPreviewDialogProps) {
  if (!item) return null

  const isPublic = "isPublic" in item ? item.isPublic : true

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pratinjau soal</DialogTitle>
          <DialogDescription>Read-only — soal dari bank Anda</DialogDescription>
        </DialogHeader>

        <QuestionMetaBadges
          subject={item.subject}
          grade={item.grade}
          difficulty={item.difficulty}
          isPublic={isPublic}
          topics={item.topics}
          showTopicCaption
        />

        <BankQuestionReadonlyBody question={item} />

        <DialogFooter>
          <Button variant="secondary" size="md" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { BankQuestionPreviewDialog }
