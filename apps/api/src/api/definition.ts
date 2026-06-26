import * as HttpApi from "@effect/platform/HttpApi"
import { ApiDatabaseError } from "./errors/http"
import { AiGroup } from "./groups/ai"
import { AnalyticsGroup } from "./groups/analytics"
import { BankGroup } from "./groups/bank"
import { BankPublicGroup } from "./groups/bank-public"
import { ClassesGroup } from "./groups/classes"
import { CurriculumGroup } from "./groups/curriculum"
import { DevAuthGroup } from "./groups/dev-auth"
import { ExamsGroup } from "./groups/exams"
import { ExportsGroup, PublicExportsGroup } from "./groups/export"
import { HealthGroup } from "./groups/health"
import { MeGroup } from "./groups/me"
import { PublicExamsGroup } from "./groups/public-exams"
import { QuestionsGroup } from "./groups/questions"
import { ResultsGroup } from "./groups/results"
import { PublicSessionsGroup, SessionsGroup } from "./groups/sessions"
import { TemplatesGroup } from "./groups/templates"

export const TeacherExamApi = HttpApi.make("TeacherExamApi")
  .add(HealthGroup)
  .add(DevAuthGroup)
  .add(PublicExamsGroup)
  .add(PublicExportsGroup)
  .add(BankPublicGroup)
  .add(CurriculumGroup)
  .add(MeGroup)
  .add(ExamsGroup)
  .add(ExportsGroup)
  .add(QuestionsGroup)
  .add(AiGroup)
  .add(BankGroup)
  .add(TemplatesGroup)
  .add(ClassesGroup)
  .add(SessionsGroup)
  .add(PublicSessionsGroup)
  .add(ResultsGroup)
  .add(AnalyticsGroup)
  .addError(ApiDatabaseError, { status: 500 })
  .prefix("/api")
