import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { user } from "@teacher-exam/db"
import { eq } from "drizzle-orm"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { runDb } from "../lib/db-effect"
import { CurrentUser } from "../middleware/auth"
import { DbClient } from "../services/db"

export const AccountLive = HttpApiBuilder.group(
  TeacherExamApi,
  "account",
  (handlers) =>
    handlers.handle("deleteAccount", () =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const db = yield* DbClient
        yield* runDb(db.delete(user).where(eq(user.id, userId)))
        return { deleted: true as const }
      }))
)
