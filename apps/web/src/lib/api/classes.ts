import type {
  ClassEntity,
  ClassWithStudents,
  CreateClassInput,
  StudentEntity,
  UpdateClassInput
} from "@teacher-exam/shared"
import { ClassSchema, ClassWithStudentsSchema, StudentSchema } from "@teacher-exam/shared"
import { Either, Schema } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const classesApi = {
  list: async (
    withStudents = false
  ): Promise<Either.Either<ReadonlyArray<ClassEntity | ClassWithStudents>, ApiClientFailure>> => {
    const qs = withStudents ? "?withStudents=true" : ""
    const raw = await apiFetchEither<unknown>(`/classes${qs}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<ReadonlyArray<ClassEntity | ClassWithStudents>, ApiClientFailure>
    }
    return decodeEither(Schema.Array(Schema.Union(ClassWithStudentsSchema, ClassSchema)), raw.right)
  },
  create: async (
    input: CreateClassInput
  ): Promise<Either.Either<ClassEntity, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>("/classes", {
      method: "POST",
      body: JSON.stringify(input)
    })
    if (Either.isLeft(raw)) {
      return raw as Either.Either<ClassEntity, ApiClientFailure>
    }
    return decodeEither(ClassSchema, raw.right)
  },
  update: async (
    id: string,
    body: UpdateClassInput
  ): Promise<Either.Either<ClassEntity, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/classes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    })
    if (Either.isLeft(raw)) {
      return raw as Either.Either<ClassEntity, ApiClientFailure>
    }
    return decodeEither(ClassSchema, raw.right)
  },
  remove: (id: string) => apiFetchEither<void>(`/classes/${id}`, { method: "DELETE" }),
  students: {
    list: async (
      classId: string
    ): Promise<Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/classes/${classId}/students`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>
      }
      return decodeEither(Schema.Array(StudentSchema), raw.right)
    },
    bulkCreate: async (
      classId: string,
      input: { students: ReadonlyArray<{ name: string; identifier?: string }> }
    ): Promise<Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/classes/${classId}/students`, {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>
      }
      return decodeEither(Schema.Array(StudentSchema), raw.right)
    },
    remove: (classId: string, studentId: string) =>
      apiFetchEither<void>(`/classes/${classId}/students/${studentId}`, { method: "DELETE" })
  }
}
