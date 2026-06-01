import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { BankService } from "../services/bank-service"

export const BankPublicLive = HttpApiBuilder.group(
  TeacherExamApi,
  "bankPublic",
  (handlers) =>
    handlers.handle("browsePublicBank", ({ urlParams }) =>
      Effect.gen(function*() {
        // "Bank Publik" lists every published soal, including the viewer's
        // own. Excluding self was the previous behavior, but it made the tab
        // empty for any user whose only public soal were their own (single-
        // user seeded env, or a brand-new teacher who just shared their
        // first exam). The author label already differentiates "soal saya"
        // from "soal guru lain", so duplication is not a problem.
        const bankService = yield* BankService
        return yield* bankService.browsePublic(urlParams)
      }))
)
