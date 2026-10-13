import { describe, expect, it } from "vitest"
import { chunkPdfPages } from "../retrieval/chunk-text"
import { formatChunkWithPage, sourcePageFromMaterial } from "../source-page"

describe("source page citation", () => {
  it("cites the page whose text matches the soal", () => {
    const chunks = chunkPdfPages([
      { page: 2, text: "Ekosistem sekolah dan rantai makanan di halaman kelas." },
      { page: 9, text: "Fotosintesis mengubah cahaya matahari menjadi makanan pada daun." }
    ])
    const material = chunks.map((chunk) => formatChunkWithPage(chunk.content, chunk.metadata)).join("\n\n")

    expect(chunks[0]?.metadata["page"]).toBe(2)
    expect(material).toContain("[hal. 2]")
    expect(sourcePageFromMaterial(
      "Rantai makanan di ekosistem sekolah terjadi pada makhluk hidup.",
      material
    )).toBe(2)
  })

  it("keeps a model page when that page is in the material", () => {
    const material = "[hal. 4]\nPerkalian pecahan\n\n[hal. 9]\nFotosintesis daun hijau"
    expect(sourcePageFromMaterial("Soal umum tanpa kata kunci.", material, 4)).toBe(4)
  })
})
