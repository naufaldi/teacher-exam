import { classes, students } from "@teacher-exam/db"
import type {
  BulkCreateStudentsInput,
  ClassEntity,
  ClassWithStudents,
  CreateClassInput,
  CreateStudentInput,
  StudentEntity,
  UpdateClassInput
} from "@teacher-exam/shared"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { Context, Data, Effect, Layer } from "effect"
import type { ApiDatabaseError } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { DbClient } from "./db"

export class ClassNotFoundError extends Data.TaggedError("ClassNotFoundError")<{
  id: string
}> {}

export class StudentNotFoundError extends Data.TaggedError("StudentNotFoundError")<{
  id: string
}> {}

export class ClassSaveError extends Data.TaggedError("ClassSaveError")<{
  cause: unknown
}> {}

export interface ClassServiceApi {
  readonly list: (
    userId: string,
    withStudents: boolean
  ) => Effect.Effect<ReadonlyArray<ClassEntity | ClassWithStudents>, ApiDatabaseError>
  readonly create: (
    userId: string,
    input: CreateClassInput
  ) => Effect.Effect<ClassEntity, ClassSaveError | ApiDatabaseError>
  readonly update: (
    userId: string,
    id: string,
    input: UpdateClassInput
  ) => Effect.Effect<ClassEntity, ClassNotFoundError | ApiDatabaseError>
  readonly remove: (
    userId: string,
    id: string
  ) => Effect.Effect<void, ClassNotFoundError | ApiDatabaseError>
  readonly listStudents: (
    userId: string,
    classId: string
  ) => Effect.Effect<ReadonlyArray<StudentEntity>, ClassNotFoundError | ApiDatabaseError>
  readonly bulkCreateStudents: (
    userId: string,
    classId: string,
    input: BulkCreateStudentsInput
  ) => Effect.Effect<ReadonlyArray<StudentEntity>, ClassNotFoundError | ApiDatabaseError>
  readonly removeStudent: (
    userId: string,
    classId: string,
    studentId: string
  ) => Effect.Effect<void, ClassNotFoundError | StudentNotFoundError | ApiDatabaseError>
}

export class ClassService extends Context.Tag("ClassService")<
  ClassService,
  ClassServiceApi
>() {}

type ClassRow = typeof classes.$inferSelect
type StudentRow = typeof students.$inferSelect

function toClass(row: ClassRow): ClassEntity {
  return {
    id: row.id as ClassEntity["id"],
    userId: row.userId as ClassEntity["userId"],
    name: row.name,
    ...(row.grade !== null ? { grade: row.grade as ClassEntity["grade"] } : {}),
    ...(row.subject !== null ? { subject: row.subject as ClassEntity["subject"] } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

function toStudent(row: StudentRow): StudentEntity {
  return {
    id: row.id as StudentEntity["id"],
    classId: row.classId as StudentEntity["classId"],
    name: row.name,
    identifier: row.identifier,
    createdAt: row.createdAt.toISOString()
  }
}

export const ClassServiceLive = Layer.effect(
  ClassService,
  Effect.gen(function*() {
    const db = yield* DbClient

    const fetchOwned = (
      userId: string,
      id: string
    ): Effect.Effect<ClassRow, ClassNotFoundError | ApiDatabaseError, DbClient> =>
      Effect.gen(function*() {
        const rows = yield* runDb(
          db.select().from(classes).where(and(eq(classes.id, id), eq(classes.userId, userId))).limit(1)
        )
        const row = rows[0]
        if (!row) {
          return yield* Effect.fail(new ClassNotFoundError({ id }))
        }
        return row
      })

    const fetchOwnedStudent = (
      userId: string,
      classId: string,
      studentId: string
    ): Effect.Effect<
      StudentRow,
      ClassNotFoundError | StudentNotFoundError | ApiDatabaseError,
      DbClient
    > =>
      Effect.gen(function*() {
        const classRow = yield* fetchOwned(userId, classId)
        const rows = yield* runDb(
          db
            .select()
            .from(students)
            .where(and(eq(students.id, studentId), eq(students.classId, classRow.id)))
            .limit(1)
        )
        const row = rows[0]
        if (!row) {
          return yield* Effect.fail(new StudentNotFoundError({ id: studentId }))
        }
        return row
      })

    const list = (
      userId: string,
      withStudents: boolean
    ): Effect.Effect<ReadonlyArray<ClassEntity | ClassWithStudents>, ApiDatabaseError> =>
      Effect.gen(function*() {
        const classRows = yield* runDb(
          db.select().from(classes).where(eq(classes.userId, userId)).orderBy(desc(classes.createdAt))
        )
        if (!withStudents) {
          return classRows.map(toClass)
        }
        if (classRows.length === 0) {
          return []
        }
        const classIds = classRows.map((row) => row.id)
        const studentRows = yield* runDb(
          db.select().from(students).where(inArray(students.classId, classIds)).orderBy(asc(students.name))
        )
        const studentsByClass = new Map<string, Array<StudentEntity>>()
        for (const row of studentRows) {
          const bucket = studentsByClass.get(row.classId) ?? []
          bucket.push(toStudent(row))
          studentsByClass.set(row.classId, bucket)
        }
        return classRows.map((row): ClassWithStudents => ({
          ...toClass(row),
          students: studentsByClass.get(row.id) ?? []
        }))
      }).pipe(Effect.provideService(DbClient, db))

    const create = (
      userId: string,
      input: CreateClassInput
    ): Effect.Effect<ClassEntity, ClassSaveError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const now = new Date()
        const inserted = yield* runDb(
          db
            .insert(classes)
            .values({
              id: crypto.randomUUID(),
              userId,
              name: input.name,
              grade: input.grade ?? null,
              subject: input.subject ?? null,
              createdAt: now,
              updatedAt: now
            })
            .returning()
        )
        const row = inserted[0]
        if (!row) {
          return yield* Effect.fail(new ClassSaveError({ cause: "No row returned" }))
        }
        return toClass(row)
      }).pipe(Effect.provideService(DbClient, db))

    const update = (
      userId: string,
      id: string,
      input: UpdateClassInput
    ): Effect.Effect<ClassEntity, ClassNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchOwned(userId, id)
        const set: Record<string, unknown> = { updatedAt: new Date() }
        if (input.name !== undefined) set.name = input.name
        if (input.grade !== undefined) set.grade = input.grade
        if (input.subject !== undefined) set.subject = input.subject
        yield* runDb(db.update(classes).set(set).where(eq(classes.id, row.id)))
        const updated = yield* runDb(
          db.select().from(classes).where(eq(classes.id, row.id)).limit(1)
        )
        const updatedRow = updated[0]
        if (!updatedRow) {
          return yield* Effect.fail(new ClassNotFoundError({ id }))
        }
        return toClass(updatedRow)
      }).pipe(Effect.provideService(DbClient, db))

    const remove = (
      userId: string,
      id: string
    ): Effect.Effect<void, ClassNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchOwned(userId, id)
        yield* runDb(db.delete(classes).where(eq(classes.id, row.id)))
      }).pipe(Effect.provideService(DbClient, db))

    const listStudents = (
      userId: string,
      classId: string
    ): Effect.Effect<ReadonlyArray<StudentEntity>, ClassNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const classRow = yield* fetchOwned(userId, classId)
        const rows = yield* runDb(
          db
            .select()
            .from(students)
            .where(eq(students.classId, classRow.id))
            .orderBy(asc(students.name))
        )
        return rows.map(toStudent)
      }).pipe(Effect.provideService(DbClient, db))

    const bulkCreateStudents = (
      userId: string,
      classId: string,
      input: BulkCreateStudentsInput
    ): Effect.Effect<ReadonlyArray<StudentEntity>, ClassNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const classRow = yield* fetchOwned(userId, classId)
        const now = new Date()
        const inserted = yield* runDb(
          db
            .insert(students)
            .values(
              input.students.map((s: CreateStudentInput) => ({
                id: crypto.randomUUID(),
                classId: classRow.id,
                name: s.name,
                identifier: s.identifier ?? null,
                createdAt: now
              }))
            )
            .returning()
        )
        return inserted.map(toStudent)
      }).pipe(Effect.provideService(DbClient, db))

    const removeStudent = (
      userId: string,
      classId: string,
      studentId: string
    ): Effect.Effect<void, ClassNotFoundError | StudentNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchOwnedStudent(userId, classId, studentId)
        yield* runDb(db.delete(students).where(eq(students.id, row.id)))
      }).pipe(Effect.provideService(DbClient, db))

    return {
      list,
      create,
      update,
      remove,
      listStudents,
      bulkCreateStudents,
      removeStudent
    }
  })
)
