import { describe, expect, it } from "vitest"
import { babTopicLabelsFromResponse } from "../curriculum-bab-topics.js"

describe("babTopicLabelsFromResponse", () => {
  it("maps Bab topic labels for TopicMultiSelect options", () => {
    expect(
      babTopicLabelsFromResponse([
        { bab: 1, title: "Aku dan Teman-Temanku", label: "Bab 1: Aku dan Teman-Temanku" },
        { bab: 2, title: "Aku Patuh pada Aturan", label: "Bab 2: Aku Patuh pada Aturan" }
      ])
    ).toEqual([
      "Bab 1: Aku dan Teman-Temanku",
      "Bab 2: Aku Patuh pada Aturan"
    ])
  })
})
