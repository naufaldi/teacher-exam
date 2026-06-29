import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  BankSheetSchema,
  BrowseBankSheetsQuerySchema,
  PaginatedBankSheetsResponseSchema,
  UseBankSheetInputSchema
} from "../../schemas/bank.js"

describe("bank schemas", () => {
  it("decodes BrowseBankSheetsQuery", () => {
    const decoded = Schema.decodeUnknownEither(BrowseBankSheetsQuerySchema)({
      subject: "ipas",
      grade: 5,
      sort: "terbaru",
      page: 1,
      limit: 8
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes PaginatedBankSheetsResponse", () => {
    const decoded = Schema.decodeUnknownEither(PaginatedBankSheetsResponseSchema)({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          userId: "user-1",
          title: "IPAS / Kelas 5 / formatif",
          subject: "ipas",
          grade: 5,
          topics: ["Energi"],
          difficulty: "sedang",
          examType: "formatif",
          status: "final",
          isPublic: true,
          questionCount: 20,
          bankedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z"
        }
      ],
      total: 1,
      page: 1,
      limit: 20
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes UseBankSheetInput", () => {
    const decoded = Schema.decodeUnknownEither(UseBankSheetInputSchema)({
      sourceExamId: "00000000-0000-4000-8000-000000000002"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("decodes BankSheet", () => {
    const decoded = Schema.decodeUnknownEither(BankSheetSchema)({
      id: "00000000-0000-4000-8000-000000000001",
      userId: "user-1",
      title: "Matematika / Kelas 5",
      subject: "matematika",
      grade: 5,
      topics: ["Pecahan"],
      difficulty: "mudah",
      examType: "formatif",
      status: "final",
      isPublic: false,
      questionCount: 15,
      bankedAt: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })
})
