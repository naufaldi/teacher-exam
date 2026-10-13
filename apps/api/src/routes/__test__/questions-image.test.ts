import { db } from "@teacher-exam/db"
import { Effect, Stream } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { TEST_GPT_IMAGE_PNG } from "../../api/services/soal-image-model"
import type { AiService } from "../../services/AiService"
import { makeChain, makeQuestionRow } from "./helpers"
import { buildHttpApiTestApp } from "./http-api-setup"

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  and: vi.fn((...args: Array<unknown>) => ({ op: "and", args })),
  ne: vi.fn((col, val) => ({ op: "ne", col, val }))
}))

const SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#336699"/></svg>`
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

const aiService: AiService = {
  generate: () => Effect.succeed([]),
  generateRaw: () => Effect.succeed("```svg\n" + SVG + "\n```"),
  validateCurriculum: () => Effect.succeed([]),
  generateDiscussion: () => Effect.succeed(""),
  streamDiscussion: () => Stream.empty
}

function ownQuestion(payload: unknown) {
  const questionRow = makeQuestionRow({
    payload,
    optionA: "Pohon",
    optionB: "Batu",
    optionC: "Sungai",
    optionD: "Gunung",
    correctAnswer: "a",
    text: "Perhatikan gambar. Hewan apakah yang ada di dekat rumah?"
  })
  let selectCount = 0
  ;(db.select as Mock).mockImplementation(() => {
    selectCount += 1
    if (selectCount % 2 === 1) return makeChain([{ questionId: "q-1", examUserId: "test-user-id" }])
    return makeChain([questionRow])
  })
  const written: Array<Record<string, unknown>> = []
  ;(db.update as Mock).mockImplementation(() => {
    const chain = makeChain([questionRow]) as ReturnType<typeof makeChain> & { set: Mock }
    chain.set = vi.fn((value: Record<string, unknown>) => {
      written.push(value)
      if ("payload" in value) return makeChain([{ ...questionRow, payload: value["payload"] }])
      return makeChain([questionRow])
    }) as unknown as Mock
    return chain
  })
  return { questionRow, written }
}

describe("question images", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stores an svg stimulus and keeps the geometry figure", async () => {
    const { written } = ownQuestion({ figure: { type: "circle", radius: 7, label: "r = 7 cm" } })
    const app = buildHttpApiTestApp({ userId: "test-user-id", aiService })
    const res = await app.request("/api/questions/q-1/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route: "svg" })
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { image?: { source: string; svg: string }; figure?: { type: string } }
    expect(body.image).toEqual({ source: "svg", svg: SVG })
    expect(body.figure).toEqual({ type: "circle", radius: 7, label: "r = 7 cm" })
    expect(written.some((update) => {
      const payload = update["payload"] as { image?: { source: string }; figure?: { type: string } } | undefined
      return payload?.image?.source === "svg" && payload.figure?.type === "circle"
    })).toBe(true)
  })

  it("stores a png from the image model", async () => {
    ownQuestion(null)
    const app = buildHttpApiTestApp({ userId: "test-user-id", aiService })
    const res = await app.request("/api/questions/q-1/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route: "model" })
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { image?: { source: string; mediaType: string; dataBase64: string } }
    expect(body.image).toEqual({
      source: "generated",
      mediaType: "image/png",
      dataBase64: TEST_GPT_IMAGE_PNG
    })
  })

  it("stores a teacher upload and then removes it", async () => {
    const { written } = ownQuestion({ figure: { type: "square", side: 4, label: "s = 4 cm" } })
    const app = buildHttpApiTestApp({ userId: "test-user-id", aiService })
    const uploaded = await app.request("/api/questions/q-1/image/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType: "image/png", dataBase64: PNG })
    })
    expect(uploaded.status).toBe(200)
    const uploadedBody = await uploaded.json() as { image?: { source: string } }
    expect(uploadedBody.image).toEqual({ source: "upload", mediaType: "image/png", dataBase64: PNG })

    const removed = await app.request("/api/questions/q-1/image", { method: "DELETE" })
    expect(removed.status).toBe(200)
    const removedBody = await removed.json() as { image?: unknown; figure?: { type: string } }
    expect(removedBody.image).toBeUndefined()
    expect(removedBody.figure).toEqual({ type: "square", side: 4, label: "s = 4 cm" })
    expect(written.map((update) => update["payload"])).toContainEqual({
      figure: { type: "square", side: 4, label: "s = 4 cm" }
    })
  })

  it("rejects an upload that is not an image", async () => {
    ownQuestion(null)
    const app = buildHttpApiTestApp({ userId: "test-user-id", aiService })
    const res = await app.request("/api/questions/q-1/image/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType: "image/png", dataBase64: "aGVsbG8=" })
    })
    expect(res.status).toBe(422)
  })
})
