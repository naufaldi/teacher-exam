import * as HttpApi from "@effect/platform/HttpApi"
import { ApiDatabaseError } from "./errors/http"
import { AiGroup } from "./groups/ai"
import { BankGroup } from "./groups/bank"
import { BankPublicGroup } from "./groups/bank-public"
import { DevAuthGroup } from "./groups/dev-auth"
import { ExamsGroup } from "./groups/exams"
import { HealthGroup } from "./groups/health"
import { MeGroup } from "./groups/me"
import { PublicExamsGroup } from "./groups/public-exams"
import { QuestionsGroup } from "./groups/questions"

export const TeacherExamApi = HttpApi.make("TeacherExamApi")
  .add(HealthGroup)
  .add(DevAuthGroup)
  .add(PublicExamsGroup)
  .add(BankPublicGroup)
  .add(MeGroup)
  .add(ExamsGroup)
  .add(QuestionsGroup)
  .add(AiGroup)
  .add(BankGroup)
  .addError(ApiDatabaseError, { status: 500 })
  .prefix("/api")
