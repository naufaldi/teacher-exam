import { afterEach, describe, expect, it, vi } from "vitest"
import { devLog } from "../dev-log.js"

describe("devLog", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})

  afterEach(() => {
    infoSpy.mockClear()
  })

  it("logs structured JSON in dev/test builds", () => {
    devLog("api.fetch", { path: "/exams/1", ok: true, durationMs: 12 })
    if (import.meta.env.DEV) {
      expect(infoSpy).toHaveBeenCalledWith(
        "[dev] {\"scope\":\"api.fetch\",\"path\":\"/exams/1\",\"ok\":true,\"durationMs\":12}"
      )
    } else {
      expect(infoSpy).not.toHaveBeenCalled()
    }
  })
})
