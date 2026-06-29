import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiNotFound, ApiValidationError422 } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { BankService } from "../services/bank-service"

export const BankLive = HttpApiBuilder.group(TeacherExamApi, "bank", (handlers) =>
  handlers
    .handle("browseBankSheets", ({ urlParams }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        return yield* bankService.browseSheets(userId, urlParams)
      }))
    .handle("updateBankSheet", ({ path, payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        return yield* bankService.updateSheet(userId, path.id, payload)
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
    .handle("useBankSheet", ({ payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        return yield* bankService.useSheet(userId, payload)
      }).pipe(
        Effect.catchTags({
          BankBuildError: (e) =>
            Effect.fail(
              new ApiValidationError422({
                error: "Validation failed",
                code: "VALIDATION_ERROR",
                details: e.message
              })
            )
        })
      ))
    .handle("getBankSheet", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        return yield* bankService.getSheet(userId, path.id)
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
      )))
