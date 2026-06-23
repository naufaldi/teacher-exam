import { describe, expect, it } from "vitest"
import { mergeBab } from "../lib/merge-bab.js"

const HEADER = `# IPAS — Kelas 4 (Fase B, Kurikulum Merdeka)

## Capaian Pembelajaran
- Menyimak: ...
`

function completeBab(num: number, title: string, body = "teks lengkap"): string {
  return `## Bab ${num}: ${title}
**Topik utama:** topik
**Sub-konsep:**
- konsep
**Teks bacaan:** |
  ${body}
**Kosakata kunci:** kata
**Kompetensi yang diuji:** kompetensi`
}

describe("mergeBab", () => {
  it("prefers a structurally complete duplicate Bab over a longer incomplete one", () => {
    const incompleteLonger = `## Bab 2: Gaya di Sekitar Kita
**Topik utama:** topik
**Sub-konsep:**
- konsep
**Teks bacaan:** |
  ${"bagian lanjutan ".repeat(40)}`

    const merged = mergeBab(`${HEADER}

${completeBab(1, "Mengubah Bentuk Energi")}

${completeBab(2, "Gaya di Sekitar Kita", "bagian awal")}

${incompleteLonger}`)

    expect(merged).toContain("## Bab 2: Gaya di Sekitar Kita")
    expect(merged).toContain("**Kosakata kunci:** kata")
    expect(merged).toContain("**Kompetensi yang diuji:** kompetensi")
  })
})
