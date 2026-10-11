import { type FunnelSink, type FunnelStage } from "@teacher-exam/shared/funnel"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { installFunnelSink, resetFunnelSink } from "../../lib/sentry-client.js"
import { ExportMenu } from "../export-menu.js"

function recordingSink(): { sink: FunnelSink; stages: Array<FunnelStage>; networkStages: Array<FunnelStage> } {
  const stages: Array<FunnelStage> = []
  const networkStages: Array<FunnelStage> = []
  const sink: FunnelSink = {
    dsn: undefined,
    append(stage) {
      stages.push(stage)
    },
    network(stage) {
      networkStages.push(stage)
    }
  }
  return { sink, stages, networkStages }
}

describe("ExportMenu funnel", () => {
  afterEach(() => {
    resetFunnelSink()
  })

  it("records print when the guru chooses Cetak, PDF, or DOCX", async () => {
    const recorded = recordingSink()
    installFunnelSink(recorded.sink)
    const user = userEvent.setup()
    render(
      <ExportMenu
        onExport={() => undefined}
        onPrint={() => undefined}
      />
    )

    await user.click(screen.getByRole("button", { name: "Unduh" }))
    await user.click(screen.getByRole("button", { name: "Cetak" }))
    await user.click(screen.getByRole("button", { name: "Unduh" }))
    await user.click(screen.getByRole("button", { name: "PDF" }))
    await user.click(screen.getByRole("button", { name: "Unduh" }))
    await user.click(screen.getByRole("button", { name: "DOCX" }))

    expect(recorded.stages).toEqual(["print", "print", "print"])
    expect(recorded.networkStages).toEqual([])
  })
})
