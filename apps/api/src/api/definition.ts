import { HttpApi } from '@effect/platform'
import { ApiDatabaseError } from './errors/http'
import { HealthGroup } from './groups/health'
import { DevAuthGroup } from './groups/dev-auth'
import { PublicExamsGroup } from './groups/public-exams'
import { MeGroup } from './groups/me'
import { ExamsGroup } from './groups/exams'
import { QuestionsGroup } from './groups/questions'
import { AiGroup } from './groups/ai'
import { BankGroup } from './groups/bank'

export const TeacherExamApi = HttpApi.make('TeacherExamApi')
  .add(HealthGroup)
  .add(DevAuthGroup)
  .add(PublicExamsGroup)
  .add(MeGroup)
  .add(ExamsGroup)
  .add(QuestionsGroup)
  .add(AiGroup)
  .add(BankGroup)
  .addError(ApiDatabaseError, { status: 500 })
  .prefix('/api')
