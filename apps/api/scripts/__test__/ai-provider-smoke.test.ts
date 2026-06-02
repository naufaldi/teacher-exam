import { afterEach, describe, expect, it, vi } from "vitest"
import { buildGenerateBody, hasProviderKeys, parseSmokeArgs, resolveProviderMatrix } from "../ai-provider-smoke.js"

describe("ai-provider-smoke helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("parseSmokeArgs reads dry-run, strict, and provider", () => {
    expect(parseSmokeArgs(["--dry-run", "--strict", "--provider", "openai"])).toEqual({
      dryRun: true,
      strict: true,
      provider: "openai"
    })
  })

  it("hasProviderKeys returns false when anthropic key is placeholder", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-REPLACE_ME")
    expect(hasProviderKeys("anthropic")).toBe(false)
  })

  it("resolveProviderMatrix returns all providers when none selected", () => {
    expect(resolveProviderMatrix(null)).toEqual(["anthropic", "minimax", "openai"])
  })

  it("buildGenerateBody uses minimal latihan payload", () => {
    expect(buildGenerateBody().totalSoal).toBe(2)
    expect(buildGenerateBody().subject).toBe("ipas")
  })
})
