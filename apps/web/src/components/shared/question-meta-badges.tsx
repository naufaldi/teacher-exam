import type { ExamDifficulty, ExamSubject } from "@teacher-exam/shared"
import { SUBJECT_LABEL } from "@teacher-exam/shared"
import { Badge } from "@teacher-exam/ui"
import { Globe, Lock } from "lucide-react"
import { subjectMetaFor } from "../../lib/subjects.js"

interface QuestionMetaBadgesProps {
  subject: ExamSubject
  grade: number
  difficulty: ExamDifficulty | string
  isPublic?: boolean
  topics?: ReadonlyArray<string>
  showTopicCaption?: boolean
  showTopicChip?: boolean
}

function QuestionMetaBadges({
  difficulty,
  grade,
  isPublic,
  showTopicCaption = false,
  showTopicChip = false,
  subject,
  topics = []
}: QuestionMetaBadgesProps) {
  const subjectMeta = subjectMetaFor(subject)
  const firstTopic = topics[0]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={subjectMeta.badgeVariant}>{SUBJECT_LABEL[subject]}</Badge>
        <Badge variant="secondary">Kelas {grade}</Badge>
        <Badge variant="pill">{difficulty}</Badge>
        {showTopicChip && firstTopic ?
          (
            <Badge variant="secondary" className="text-caption shrink-0">
              {firstTopic.split(" ")[0] ?? firstTopic}
            </Badge>
          ) :
          null}
        {isPublic === true ?
          (
            <Badge variant="success">
              <Globe size={12} className="mr-1 inline" />
              Publik
            </Badge>
          ) :
          isPublic === false ?
          (
            <Badge variant="secondary">
              <Lock size={12} className="mr-1 inline" />
              Pribadi
            </Badge>
          ) :
          null}
      </div>
      {showTopicCaption && topics.length > 0 ?
        <p className="text-caption text-text-tertiary">Topik: {topics.join(", ")}</p> :
        null}
    </div>
  )
}

export { QuestionMetaBadges }
