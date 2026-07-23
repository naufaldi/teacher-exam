import { beforeEach, describe, expect, it, vi } from "vitest"
import { unwrapApiEither } from "../api/core"
import { pdfUploadsApi } from "../api/pdf-uploads"

const mockFetch = vi.fn()

beforeEach(() => {
  globalThis.fetch = mockFetch
  mockFetch.mockReset()
})

describe("pdfUploadsApi.get", () => {
  it("GETs and decodes a PDF upload detail", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "7f4fb993-e00f-41a5-8c05-ece27bc52f2f",
          status: "ready",
          filename: "materi.pdf",
          pageCount: 134,
          createdAt: "2026-07-23T06:52:43.000Z",
          readyAt: "2026-07-23T06:52:47.000Z"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    )

    const detail = unwrapApiEither(
      await pdfUploadsApi.get("7f4fb993-e00f-41a5-8c05-ece27bc52f2f")
    )

    expect(detail.status).toBe("ready")
    expect(detail.pageCount).toBe(134)
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pdf-uploads/7f4fb993-e00f-41a5-8c05-ece27bc52f2f",
      expect.objectContaining({ credentials: "include" })
    )
  })
})
