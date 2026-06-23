import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  classifyCatalogueItem,
  collectAndDownloadSibiBooks,
  filenameFromAttachment,
  isOfficialSibiPdfUrl,
  shouldKeepCatalogueItem
} from "../lib/curriculum-download-books.js"

const baseItem = {
  title: "Bahasa Indonesia Aku Bisa! untuk SD/MI Kelas I (Edisi Revisi)",
  attachment: "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Bahasa_Indonesia_BS_KLS_I_Rev.pdf",
  class: "1",
  level: "SD/MI",
  subject: "bahasa_indonesia",
  type: "pdf",
  book_type: "buku_siswa",
  taxonomy_name: "Buku PDF"
}

describe("curriculum download book filtering", () => {
  it("keeps scoped SD Buku Siswa PDF rows", () => {
    expect(shouldKeepCatalogueItem(baseItem)).toBe(true)
    expect(classifyCatalogueItem(baseItem)).toMatchObject({
      grade: 1,
      subjectKey: "bahasa_indonesia",
      reason: "keep"
    })
  })

  it("normalizes SIBI subject casing before applying mapel scope", () => {
    expect(
      classifyCatalogueItem({
        ...baseItem,
        title: "Bahasa Inggris: English for Nusantara Kids untuk SD/MI Kelas V",
        attachment: "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Inggris_FN_BS_KLS_V.pdf",
        class: "5",
        subject: "Bahasa_Inggris"
      })
    ).toMatchObject({
      reason: "keep",
      subjectKey: "bahasa_inggris"
    })
  })

  it("rejects Panduan Guru even when SIBI labels book_type as buku_siswa", () => {
    expect(
      shouldKeepCatalogueItem({
        ...baseItem,
        title: "Buku Panduan Guru Matematika untuk SD/MI Kelas I",
        attachment: "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Matematika-BG-KLS-I.pdf",
        subject: "matematika"
      })
    ).toBe(false)
  })

  it("rejects non-Buku Siswa and non-Buku PDF rows", () => {
    expect(shouldKeepCatalogueItem({ ...baseItem, book_type: "buku_guru" })).toBe(false)
    expect(shouldKeepCatalogueItem({ ...baseItem, taxonomy_name: "Buku Audio" })).toBe(false)
  })

  it("keeps SIBI legacy Buku PDF book_type when taxonomy and title identify a student PDF", () => {
    expect(
      shouldKeepCatalogueItem({
        ...baseItem,
        title: "Matematika untuk SD/MI Kelas V",
        attachment: "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Matematika-BS-KLS-V.pdf",
        class: "5",
        subject: "Matematika",
        book_type: "Buku PDF"
      })
    ).toBe(true)
  })

  it("rejects incomplete SIBI rows with null metadata instead of crashing", () => {
    expect(shouldKeepCatalogueItem({ ...baseItem, subject: null })).toBe(false)
  })

  it("rejects audio, non-SD, K13 theme books, and muatan lokal", () => {
    expect(shouldKeepCatalogueItem({ ...baseItem, title: "Buku Audio Bahasa Indonesia", type: "audio" })).toBe(false)
    expect(
      shouldKeepCatalogueItem({
        ...baseItem,
        title: "Bahasa Indonesia untuk SMP Kelas VII",
        level: "SMP/MTS",
        class: "7"
      })
    ).toBe(false)
    expect(shouldKeepCatalogueItem({ ...baseItem, title: "Buku Kelas I Tema 1 Diriku", subject: "bahasa_indonesia" }))
      .toBe(false)
    expect(shouldKeepCatalogueItem({ ...baseItem, title: "Muatan Lokal untuk SD Kelas I", subject: "muatan_lokal" }))
      .toBe(false)
  })

  it("accepts official static SIBI PDF URLs and rejects non-official URLs", () => {
    expect(isOfficialSibiPdfUrl(baseItem.attachment)).toBe(true)
    expect(
      isOfficialSibiPdfUrl("https://static.sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/IPAS_BS_KLS_III.pdf")
    )
      .toBe(true)
    expect(isOfficialSibiPdfUrl("https://example.com/book.pdf")).toBe(false)
    expect(isOfficialSibiPdfUrl("https://static-sc.cloudapp.web.id/content/image/cover.png")).toBe(false)
  })

  it("uses the attachment basename as the stable local filename", () => {
    expect(
      filenameFromAttachment(
        "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Indonesia_BS_KLS_III_Rev+.pdf"
      )
    )
      .toBe("Indonesia_BS_KLS_III_Rev+.pdf")
  })

  it("discovers scoped books from the paged SIBI textbook endpoint", async () => {
    const pdfDir = await mkdtemp(join(tmpdir(), "curriculum-download-books-"))
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes("getPenggerakTextBooks") && url.includes("offset=0")) {
        return Response.json({
          status: "success",
          totalSize: 101,
          results: [
            {
              ...baseItem,
              title: "Matematika untuk SD/MI Kelas I",
              slug: "matematika-untuk-sdmi-kelas-i",
              subject: "matematika",
              attachment: "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Matematika-BS-KLS-I.pdf"
            }
          ]
        })
      }
      if (url.includes("getPenggerakTextBooks") && url.includes("offset=100")) {
        return Response.json({
          status: "success",
          totalSize: 101,
          results: [
            {
              ...baseItem,
              title: "Pendidikan Pancasila untuk SD/MI Kelas II",
              slug: "pendidikan-pancasila-untuk-sdmi-kelas-ii",
              class: "2",
              subject: "pendidikan_pancasila",
              attachment:
                "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Pendidikan-Pancasila-BS-KLS-II.pdf"
            }
          ]
        })
      }
      return Response.json({ status: "success", results: [], totalSize: 0 })
    }

    const rows = await collectAndDownloadSibiBooks({
      dryRun: true,
      fetchImpl: fetchImpl as typeof fetch,
      pdfDir
    })

    expect(rows.map((row) => row.filename)).toEqual([
      "Matematika-BS-KLS-I.pdf",
      "Pendidikan-Pancasila-BS-KLS-II.pdf"
    ])
  })
})
