import { describe, expect, it } from "vitest"
import { buildRegeneratePrompt } from "../prompt.js"

const FAKE_CURRICULUM = "# Matematika Kelas 5\n## Capaian Pembelajaran\n- Operasi hitung"

describe("buildRegeneratePrompt", () => {
  it("returns { system, user } with GPT-5.4 section headers", () => {
    const { system, user } = buildRegeneratePrompt({
      grade: 5,
      subjectLabel: "Matematika",
      examSubject: "matematika",
      topic: "Pecahan",
      difficulty: "sedang",
      siblingTexts: ["Soal lama tentang pecahan"]
    })

    expect(system).toContain("# Peran")
    expect(system).toContain("# Tujuan")
    expect(system).toContain("# Verifikasi")
    expect(system).toContain("# Aturan berhenti")
    expect(typeof user).toBe("string")
    expect(JSON.parse(user)).toMatchObject({
      kelas: 5,
      mata_pelajaran: "Matematika",
      topik: "Pecahan"
    })
  })

  it("includes curriculum corpus when provided", () => {
    const { system } = buildRegeneratePrompt({
      grade: 5,
      subjectLabel: "Matematika",
      examSubject: "matematika",
      topic: "Pecahan",
      difficulty: "sedang",
      siblingTexts: [],
      curriculumText: FAKE_CURRICULUM
    })

    expect(system).toContain(FAKE_CURRICULUM)
    expect(system).toContain("--- KORPUS BUKU SISWA")
  })

  it("omits corpus markers when curriculumText is absent", () => {
    const { system } = buildRegeneratePrompt({
      grade: 5,
      subjectLabel: "Bahasa Indonesia",
      examSubject: "bahasa_indonesia",
      topic: "Teks Narasi",
      difficulty: "mudah",
      siblingTexts: []
    })

    expect(system).not.toContain("--- KORPUS BUKU SISWA")
    expect(system).toContain("# Grounding")
  })

  it("adds Matematika LaTeX rules and mcq_single example", () => {
    const { system } = buildRegeneratePrompt({
      grade: 5,
      subjectLabel: "Matematika",
      examSubject: "matematika",
      topic: "Operasi Hitung",
      difficulty: "mudah",
      siblingTexts: []
    })

    expect(system).toContain("$inline$")
    expect(system).toContain("\"mcq_single\"")
    expect(system).toContain("Contoh minimal mcq_single")
  })

  it("includes petunjuk_guru in user payload when hint provided", () => {
    const { user } = buildRegeneratePrompt({
      grade: 6,
      subjectLabel: "Bahasa Indonesia",
      examSubject: "bahasa_indonesia",
      topic: "Ide Pokok",
      difficulty: "sedang",
      siblingTexts: ["Stem lama"],
      hint: "Buat lebih mudah"
    })

    expect(JSON.parse(user)).toMatchObject({ petunjuk_guru: "Buat lebih mudah" })
  })
})
