import { Schema } from "effect"
import { UserIdSchema } from "./entities.js"
import { ExamSubjectSchema, ExamTypeSchema, GradeSchema } from "./primitives.js"
// ── Branded IDs ────────────────────────────────────────────
export const ClassIdSchema = Schema.String.pipe(Schema.brand("ClassId"))
export type ClassId = typeof ClassIdSchema.Type

export const StudentIdSchema = Schema.String.pipe(Schema.brand("StudentId"))
export type StudentId = typeof StudentIdSchema.Type

// ── Class entity ───────────────────────────────────────────
export const ClassSchema = Schema.Struct({
  id: ClassIdSchema,
  userId: UserIdSchema,
  name: Schema.NonEmptyString,
  grade: Schema.optional(GradeSchema),
  subject: Schema.optional(ExamSubjectSchema),
  schoolName: Schema.NullOr(Schema.String),
  academicYear: Schema.NullOr(Schema.String),
  defaultExamType: Schema.NullOr(ExamTypeSchema),
  defaultExamDate: Schema.NullOr(Schema.String),
  defaultDurationMinutes: Schema.NullOr(Schema.Int),
  defaultInstructions: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type ClassEntity = typeof ClassSchema.Type

// ── Student entity ─────────────────────────────────────────
export const StudentSchema = Schema.Struct({
  id: StudentIdSchema,
  classId: ClassIdSchema,
  name: Schema.NonEmptyString,
  identifier: Schema.NullOr(Schema.String),
  createdAt: Schema.String
})
export type StudentEntity = typeof StudentSchema.Type

// ── Class list response (withStudents variant) ─────────────
export const ClassWithStudentsSchema = Schema.Struct({
  ...ClassSchema.fields,
  students: Schema.Array(StudentSchema)
})
export type ClassWithStudents = typeof ClassWithStudentsSchema.Type

// ── API input schemas ──────────────────────────────────────
export const CreateClassInputSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  grade: Schema.optional(GradeSchema),
  subject: Schema.optional(ExamSubjectSchema),
  schoolName: Schema.optional(Schema.String),
  academicYear: Schema.optional(Schema.String),
  defaultExamType: Schema.optional(ExamTypeSchema),
  defaultExamDate: Schema.optional(Schema.String),
  defaultDurationMinutes: Schema.optional(Schema.Int),
  defaultInstructions: Schema.optional(Schema.String)
})
export type CreateClassInput = typeof CreateClassInputSchema.Type

export const UpdateClassInputSchema = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  grade: Schema.optional(GradeSchema),
  subject: Schema.optional(ExamSubjectSchema),
  schoolName: Schema.optional(Schema.String),
  academicYear: Schema.optional(Schema.String),
  defaultExamType: Schema.optional(ExamTypeSchema),
  defaultExamDate: Schema.optional(Schema.String),
  defaultDurationMinutes: Schema.optional(Schema.Int),
  defaultInstructions: Schema.optional(Schema.String)
})
export type UpdateClassInput = typeof UpdateClassInputSchema.Type

export const CreateStudentInputSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  identifier: Schema.optional(Schema.String)
})
export type CreateStudentInput = typeof CreateStudentInputSchema.Type

export const BulkCreateStudentsInputSchema = Schema.Struct({
  students: Schema.Array(CreateStudentInputSchema).pipe(Schema.minItems(1))
})
export type BulkCreateStudentsInput = typeof BulkCreateStudentsInputSchema.Type

export type ClassListResponse = ReadonlyArray<ClassEntity | ClassWithStudents>
export type StudentListResponse = ReadonlyArray<StudentEntity>

// ── URL params ─────────────────────────────────────────────
export const ListClassesUrlParamsSchema = Schema.Struct({
  withStudents: Schema.optional(Schema.BooleanFromString)
})
export type ListClassesUrlParams = typeof ListClassesUrlParamsSchema.Type
