import type { BankQuestion } from '@teacher-exam/shared'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@teacher-exam/ui'
import { BankQuestionReadonlyBody } from './bank-question-readonly-body.js'
import { QuestionMetaBadges } from '../shared/question-meta-badges.js'

interface BankQuestionPreviewDialogProps {
  item: BankQuestion | null
  open: boolean
  onClose: () => void
}

function BankQuestionPreviewDialog({ item, open, onClose }: BankQuestionPreviewDialogProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pratinjau soal</DialogTitle>
          <DialogDescription>Read-only — soal dari bank Anda</DialogDescription>
        </DialogHeader>

        <QuestionMetaBadges
          subject={item.subject}
          grade={item.grade}
          difficulty={item.difficulty}
          isPublic={item.isPublic}
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
