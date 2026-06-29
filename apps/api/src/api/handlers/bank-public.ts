import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiNotFound } from "../errors/http"
import { BankService } from "../services/bank-service"

export const BankPublicLive = HttpApiBuilder.group(
  TeacherExamApi,
  "bankPublic",
  (handlers) =>
    handlers
      .handle("browsePublicBankSheets", ({ urlParams }) =>
        Effect.gen(function*() {
          const bankService = yield* BankService
          return yield* bankService.browsePublicSheets(urlParams)
        }))
      .handle("getPublicBankSheet", ({ path }) =>
        Effect.gen(function*() {
          const bankService = yield* BankService
          return yield* bankService.getPublicSheet(path.id)
        }).pipe(
          Effect.catchTags({
            BankNotFoundError: (e) =>
              Effect.fail(
                new ApiNotFound({
                  error: `Bank sheet ${e.id} not found`,
                  code: "NOT_FOUND"
                })
              )
          })
        ))
)
