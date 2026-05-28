import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { TeacherExamApi } from '../definition'
import { ApiNotFound } from '../errors/http'
import { CurrentUser } from '../middleware/auth'
import { BankNotFoundError, BankSaveError, BankService } from '../services/bank-service'

export const BankLive = HttpApiBuilder.group(TeacherExamApi, 'bank', (handlers) =>
  handlers
    .handle('saveQuestion', ({ payload }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        return yield* bankService.saveQuestion(userId, payload)
      }).pipe(
        Effect.catchTags({
          BankSaveError: (e) =>
            Effect.fail(
              new ApiNotFound({
                error: String(e.cause),
                code: 'NOT_FOUND',
              }),
            ),
        }),
      ),
    )
    .handle('browseBank', ({ urlParams }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        return yield* bankService.browseOwn(userId, urlParams)
      }),
    )
    .handle('updateBankQuestion', ({ path, payload }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        return yield* bankService.update(userId, path.id, payload)
      }).pipe(
        Effect.catchTags({
          BankNotFoundError: (e) =>
            Effect.fail(
              new ApiNotFound({
                error: `Bank question ${e.id} not found`,
                code: 'NOT_FOUND',
              }),
            ),
        }),
      ),
    )
    .handle('removeBankQuestion', ({ path }) =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUser
        const bankService = yield* BankService
        yield* bankService.remove(userId, path.id)
      }).pipe(
        Effect.catchTags({
          BankNotFoundError: (e) =>
            Effect.fail(
              new ApiNotFound({
                error: `Bank question ${e.id} not found`,
                code: 'NOT_FOUND',
              }),
            ),
        }),
      ),
    ),
)
