import { ToastProvider } from "@teacher-exam/ui"
import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

describe("ToastProvider hydration", () => {
  it("leaves the toast region out of the prerendered HTML", () => {
    const html = renderToString(
      <ToastProvider>
        <p>Anak</p>
      </ToastProvider>
    )
    expect(html).toContain("Anak")
    expect(html).not.toContain("Notifikasi")
  })

  it("mounts the toast region in the browser", async () => {
    render(
      <ToastProvider>
        <p>Anak</p>
      </ToastProvider>
    )
    expect(await screen.findByRole("region", { name: "Notifikasi" })).toBeTruthy()
  })
})
