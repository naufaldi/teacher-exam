import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { fileToSoalUpload } from "../../lib/soal-image-file.js"
import { SoalImageControls } from "../soal-image-controls.js"
import { SoalImageView } from "../soal-image-view.js"

const SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#336699"/></svg>`
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

describe("SoalImageView", () => {
  test("shows the svg stimulus in color in the editor", () => {
    const { container } = render(<SoalImageView image={{ source: "svg", svg: SVG }} printSafe={false} />)
    const node = container.querySelector("[data-soal-image]")
    expect(node?.innerHTML).toContain("<rect")
    expect(node?.getAttribute("style")).toBeNull()
  })

  test("forces grayscale on the print sheet", () => {
    const { container } = render(
      <SoalImageView image={{ source: "generated", mediaType: "image/png", dataBase64: PNG }} printSafe />
    )
    const node = container.querySelector("[data-soal-image]")
    expect(node?.getAttribute("style")).toContain("grayscale")
    expect(container.querySelector("img")?.getAttribute("src")).toContain("data:image/png;base64,")
  })
})

describe("SoalImageControls", () => {
  test("remove calls the teacher action when an image is present", async () => {
    const onRemove = vi.fn()
    render(
      <SoalImageControls
        busy={false}
        hasImage
        onDrawModel={() => undefined}
        onDrawSvg={() => undefined}
        onRemove={onRemove}
        onUpload={() => undefined}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: "Hapus gambar" }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})

describe("fileToSoalUpload", () => {
  test("accepts a png file and rejects a text file", async () => {
    const bytes = Uint8Array.from(atob(PNG), (char) => char.charCodeAt(0))
    const png = new File([bytes], "pohon.png", { type: "image/png" })
    const text = new File(["hello"], "catatan.txt", { type: "text/plain" })
    const uploaded = await fileToSoalUpload(png)
    expect(uploaded).toEqual({ mediaType: "image/png", dataBase64: PNG })
    expect(await fileToSoalUpload(text)).toBeNull()
  })
})
