import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  CreateTemplateInputSchema,
  ExamTemplateSchema,
  TemplateApplyResponseSchema,
  UpdateTemplateInputSchema
} from "../../schemas/templates.js"

describe("templates schemas", () => {
  it("decodes CreateTemplateInput with a full generation config", () => {
    const decoded = Schema.decodeUnknownEither(CreateTemplateInputSchema)({
      name: "Latihan IPAS kelas 5",
      description: "Set latihan mingguan",
      config: {
        subject: "ipas",
        grade: 5,
        difficulty: "sedang",
        topics: ["Energi", "Gerak"],
        reviewMode: "fast",
        examType: "latihan",
        totalSoal: 20,
        composition: { mcqSingle: 15, mcqMulti: 0, trueFalse: 5 }
      }
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects CreateTemplateInput without topics", () => {
    const decoded = Schema.decodeUnknownEither(CreateTemplateInputSchema)({
      name: "Tanpa topik",
      config: {
        subject: "ipas",
        grade: 5,
        difficulty: "sedang",
        topics: [],
        reviewMode: "fast"
      }
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("rejects CreateTemplateInput with empty name", () => {
    const decoded = Schema.decodeUnknownEither(CreateTemplateInputSchema)({
      name: "",
      config: {
        subject: "ipas",
        grade: 5,
        difficulty: "sedang",
        topics: ["Energi"],
        reviewMode: "fast"
      }
    })
    expect(Either.isLeft(decoded)).toBe(true)
  })

  it("decodes ExamTemplate response with usageCount and timestamps", () => {
    const decoded = Schema.decodeUnknownEither(ExamTemplateSchema)({
      id: "tpl-1",
      userId: "user-1",
      name: "Latihan IPAS",
      description: null,
      config: {
        subject: "ipas",
        grade: 5,
        difficulty: "sedang",
        topics: ["Energi"],
        reviewMode: "fast"
      },
      usageCount: 3,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes UpdateTemplateInput with only name", () => {
    const decoded = Schema.decodeUnknownEither(UpdateTemplateInputSchema)({
      name: "Nama baru"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("TemplateApplyResponse is a valid GenerateExamInput shape", () => {
    const decoded = Schema.decodeUnknownEither(TemplateApplyResponseSchema)({
      subject: "ipas",
      grade: 5,
      difficulty: "sedang",
      topics: ["Energi", "Gerak"],
      reviewMode: "fast",
      examType: "latihan",
      totalSoal: 20,
      composition: { mcqSingle: 15, mcqMulti: 0, trueFalse: 5 },
      templateId: "tpl-1"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })
})
