import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { UpdateProfileInputSchema, UserProfileSchema } from "@teacher-exam/shared"
import {
  ApiConflict,
  ApiInvalidJsonBody400,
  ApiUnauthorizedSimple,
  ApiUserNotFound,
  ApiValidationError400
} from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

export const MeGroup = HttpApiGroup.make("me")
  .add(
    HttpApiEndpoint.get("getMe", "/me")
      .addSuccess(UserProfileSchema)
      .addError(ApiUnauthorizedSimple, { status: 401 })
      .addError(ApiUserNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.patch("patchMe", "/me")
      .setPayload(UpdateProfileInputSchema)
      .addSuccess(UserProfileSchema)
      .addError(ApiUnauthorizedSimple, { status: 401 })
      .addError(ApiInvalidJsonBody400, { status: 400 })
      .addError(ApiValidationError400, { status: 400 })
      .addError(ApiConflict, { status: 409 })
      .addError(ApiUserNotFound, { status: 404 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
