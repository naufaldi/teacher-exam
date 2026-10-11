import type {
  RegenerateQuestionInput,
  SetSoalImageInput,
  UpdateQuestionInput,
  UploadSoalImageInput
} from "@teacher-exam/shared"
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
    }),
  setImage: (id: string, body: SetSoalImageInput) =>
    fetchDecoded(`/questions/${id}/image`, QuestionSchema, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  uploadImage: (id: string, body: UploadSoalImageInput) =>
    fetchDecoded(`/questions/${id}/image/upload`, QuestionSchema, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  removeImage: (id: string) =>
    fetchDecoded(`/questions/${id}/image`, QuestionSchema, {
      method: "DELETE"
    })
}
