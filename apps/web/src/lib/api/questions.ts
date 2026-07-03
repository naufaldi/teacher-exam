import type { RegenerateQuestionInput, UpdateQuestionInput } from "@teacher-exam/shared"
import { QuestionSchema } from "@teacher-exam/shared"
import { fetchDecoded } from "./core.js"

export const questionsApi = {
  patch: (id: string, body: UpdateQuestionInput) =>
    fetchDecoded(`/questions/${id}`, QuestionSchema, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  regenerate: (id: string, body?: RegenerateQuestionInput) =>
    fetchDecoded(`/questions/${id}/regenerate`, QuestionSchema, {
      method: "POST",
      body: JSON.stringify(body ?? {})
    })
}
