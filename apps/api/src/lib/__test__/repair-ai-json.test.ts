import { describe, expect, it } from "vitest"
import { parseAiJsonArray, repairAiJson } from "../repair-ai-json"

describe("repairAiJson", () => {
  it("quotes unquoted Rupiah values after option fields", () => {
    const broken =
      "[{\"_tag\":\"mcq_single\",\"number\":1,\"text\":\"Berapa harga?\",\"option_a\": Rp350.000,\"option_b\":\"Rp400.000\",\"option_c\":\"Rp450.000\",\"option_d\":\"Rp500.000\",\"correct_answer\":\"a\",\"topic\":\"Pecahan\",\"difficulty\":\"mudah\"}]"
    const repaired = repairAiJson(broken)
    expect(repaired).toContain("\"option_a\": \"Rp350.000\"")
    expect(() => JSON.parse(repaired)).not.toThrow()
  })

  it("quotes unquoted Rupiah values after text field", () => {
    const broken =
      "[{\"_tag\":\"mcq_single\",\"number\":1,\"text\": Rp350.000,\"option_a\":\"A\",\"option_b\":\"B\",\"option_c\":\"C\",\"option_d\":\"D\",\"correct_answer\":\"a\",\"topic\":\"T\",\"difficulty\":\"mudah\"}]"
    const repaired = repairAiJson(broken)
    expect(repaired).toContain("\"text\": \"Rp350.000\"")
    expect(() => JSON.parse(repaired)).not.toThrow()
  })

  it("leaves already-valid JSON unchanged", () => {
    const valid =
      "[{\"_tag\":\"mcq_single\",\"number\":1,\"text\":\"Q\",\"option_a\":\"Rp350.000\",\"option_b\":\"B\",\"option_c\":\"C\",\"option_d\":\"D\",\"correct_answer\":\"a\",\"topic\":\"T\",\"difficulty\":\"mudah\"}]"
    expect(repairAiJson(valid)).toBe(valid)
  })
})

describe("parseAiJsonArray", () => {
  it("parses valid JSON without repair", () => {
    const raw = "[{\"number\":1}]"
    const result = parseAiJsonArray(raw)
    expect(result).toEqual([{ number: 1 }])
  })

  it("repairs and parses malformed Rupiah JSON", () => {
    const broken =
      "[{\"_tag\":\"mcq_single\",\"number\":1,\"text\":\"Q\",\"option_a\": Rp350.000,\"option_b\":\"B\",\"option_c\":\"C\",\"option_d\":\"D\",\"correct_answer\":\"a\",\"topic\":\"T\",\"difficulty\":\"mudah\"}]"
    const result = parseAiJsonArray(broken)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ option_a: "Rp350.000" })
  })

  it("throws when JSON is unrecoverable", () => {
    expect(() => parseAiJsonArray("not json at all")).toThrow()
  })
})
