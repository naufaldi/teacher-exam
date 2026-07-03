import type { UpdateProfileInput } from "@teacher-exam/shared"
import { UserProfileSchema } from "@teacher-exam/shared"
import { fetchDecoded } from "./core.js"

export const meApi = {
  get: () => fetchDecoded("/me", UserProfileSchema),
  update: (body: UpdateProfileInput) =>
    fetchDecoded("/me", UserProfileSchema, {
      method: "PATCH",
      body: JSON.stringify(body)
    })
}
