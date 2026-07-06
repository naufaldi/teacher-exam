import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  BulkCreateStudentsInputSchema,
  ClassSchema,
  CreateClassInputSchema,
  CreateStudentInputSchema,
  StudentSchema,
  UpdateClassInputSchema
} from "../../schemas/classes.js"

describe("classes schemas", () => {
  it("decodes ClassSchema with grade, subject, and timestamps", () => {
    const decoded = Schema.decodeUnknownEither(ClassSchema)({
      id: "cls-1",
      userId: "user-1",
      name: "Kelas 5A",
      grade: 5,
      subject: "ipas",
      schoolName: null,
      academicYear: null,
      defaultExamType: null,
      defaultExamDate: null,
      defaultDurationMinutes: null,
      defaultInstructions: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes ClassSchema with optional grade/subject omitted", () => {
    const decoded = Schema.decodeUnknownEither(ClassSchema)({
      id: "cls-1",
      userId: "user-1",
      name: "Kelas 5A",
      schoolName: null,
      academicYear: null,
      defaultExamType: null,
      defaultExamDate: null,
      defaultDurationMinutes: null,
      defaultInstructions: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes ClassSchema with reusable worksheet defaults", () => {
    const decoded = Schema.decodeUnknownEither(ClassSchema)({
      id: "cls-1",
      userId: "user-1",
      name: "Kelas 5A",
      grade: 5,
      subject: "matematika",
      schoolName: "SDN Jakarta",
      academicYear: "2025/2026",
      defaultExamType: "formatif",
      defaultExamDate: "2026-05-14",
      defaultDurationMinutes: 60,
      defaultInstructions: "Kerjakan dengan teliti.",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.schoolName).toBe("SDN Jakarta")
      expect(decoded.right.defaultDurationMinutes).toBe(60)
    }
  })

  it("rejects ClassSchema with empty name", () => {
    const decoded = Schema.decodeUnknownEither(ClassSchema)({
      id: "cls-1",
      userId: "user-1",
      name: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("rejects ClassSchema with invalid subject", () => {
    const decoded = Schema.decodeUnknownEither(ClassSchema)({
      id: "cls-1",
      userId: "user-1",
      name: "Kelas 5A",
      subject: "fisika",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes StudentSchema with null identifier", () => {
    const decoded = Schema.decodeUnknownEither(StudentSchema)({
      id: "std-1",
      classId: "cls-1",
      name: "Budi",
      identifier: null,
      createdAt: "2024-01-01T00:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes StudentSchema with identifier", () => {
    const decoded = Schema.decodeUnknownEither(StudentSchema)({
      id: "std-1",
      classId: "cls-1",
      name: "Budi",
      identifier: "12345",
      createdAt: "2024-01-01T00:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes CreateClassInputSchema with name and optional fields", () => {
    const decoded = Schema.decodeUnknownEither(CreateClassInputSchema)({
      name: "Kelas 6B",
      grade: 6,
      subject: "matematika"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes CreateClassInputSchema with worksheet defaults", () => {
    const decoded = Schema.decodeUnknownEither(CreateClassInputSchema)({
      name: "Kelas 5A",
      schoolName: "SDN Jakarta",
      academicYear: "2025/2026",
      defaultExamType: "formatif",
      defaultDurationMinutes: 90
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.defaultExamType).toBe("formatif")
    }
  })

  it("rejects CreateClassInputSchema with invalid grade", () => {
    const decoded = Schema.decodeUnknownEither(CreateClassInputSchema)({
      name: "Kelas 9",
      grade: 9
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes UpdateClassInputSchema with only name", () => {
    const decoded = Schema.decodeUnknownEither(UpdateClassInputSchema)({
      name: "Nama baru"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes UpdateClassInputSchema with worksheet defaults", () => {
    const decoded = Schema.decodeUnknownEither(UpdateClassInputSchema)({
      schoolName: "SDN Baru",
      academicYear: "2026/2027",
      defaultExamType: "sas",
      defaultExamDate: "2026-12-10",
      defaultDurationMinutes: 120,
      defaultInstructions: "Dahulukan soal mudah."
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes CreateStudentInputSchema with name and optional identifier", () => {
    const decoded = Schema.decodeUnknownEither(CreateStudentInputSchema)({
      name: "Siti",
      identifier: "NIS-001"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes BulkCreateStudentsInputSchema with an array of students", () => {
    const decoded = Schema.decodeUnknownEither(BulkCreateStudentsInputSchema)({
      students: [
        { name: "Budi", identifier: "001" },
        { name: "Siti" }
      ]
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects BulkCreateStudentsInputSchema with empty students array", () => {
    const decoded = Schema.decodeUnknownEither(BulkCreateStudentsInputSchema)({
      students: []
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("rejects BulkCreateStudentsInputSchema when a student name is empty", () => {
    const decoded = Schema.decodeUnknownEither(BulkCreateStudentsInputSchema)({
      students: [{ name: "" }]
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })
})
