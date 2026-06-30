import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatSummary } from "../stat-summary.js"

describe("StatSummary", () => {
  it("shows weekly empty hint when lifetime sheets exist but none touched this week", () => {
    render(
      <StatSummary
        stats={{ totalSheets: 6, finalCount: 3, draftCount: 3 }}
        weeklyActivity={[
          { day: "Rab", count: 0 },
          { day: "Kam", count: 0 },
          { day: "Jum", count: 0 },
          { day: "Sab", count: 0 },
          { day: "Min", count: 0 },
          { day: "Sen", count: 0 },
          { day: "Sel", count: 0, variant: "secondary" }
        ]}
        weeklyUniqueSheetCount={0}
      />
    )

    expect(screen.getByText("6")).toBeInTheDocument()
    expect(screen.getByText("0 lembar")).toBeInTheDocument()
    expect(screen.getByText(/tidak ada lembar disentuh minggu ini/i)).toBeInTheDocument()
  })

  it("hides weekly empty hint when there is weekly activity", () => {
    render(
      <StatSummary
        stats={{ totalSheets: 6, finalCount: 3, draftCount: 3 }}
        weeklyActivity={[
          { day: "Rab", count: 0 },
          { day: "Kam", count: 0 },
          { day: "Jum", count: 0 },
          { day: "Sab", count: 0 },
          { day: "Min", count: 0 },
          { day: "Sen", count: 1 },
          { day: "Sel", count: 0, variant: "secondary" }
        ]}
        weeklyUniqueSheetCount={1}
      />
    )

    expect(screen.getByText("1 lembar")).toBeInTheDocument()
    expect(screen.queryByText(/tidak ada lembar disentuh minggu ini/i)).not.toBeInTheDocument()
  })
})
