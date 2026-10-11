import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { DeleteAccountInputSchema, DeleteAccountResultSchema } from "@teacher-exam/shared"
import { ApiDatabaseError, ApiUnauthorizedSimple } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

export const AccountGroup = HttpApiGroup.make("account")
  .add(
    HttpApiEndpoint.post("deleteAccount", "/account")
      .setPayload(DeleteAccountInputSchema)
      .addSuccess(DeleteAccountResultSchema)
      .addError(ApiUnauthorizedSimple, { status: 401 })
      .addError(ApiDatabaseError, { status: 500 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
