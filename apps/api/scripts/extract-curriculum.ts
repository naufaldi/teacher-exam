import type { LanguageModel } from "@effect/ai"
import { NodeRuntime } from "@effect/platform-node"
import type { ExamSubject } from "@teacher-exam/shared"
import type { Layer } from "effect"
import { Data, Effect } from "effect"
import { existsSync } from "node:fs"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { PDFDocument } from "pdf-lib"
import { AiGenerationError } from "../src/errors/index.js"
import { curriculumMdFilename } from "../src/lib/curriculum.js"
import {
  createModelLayersFromResolved,
  resolveAnthropicLayerConfig,
  resolveMinimaxLayerConfig,
  resolveOpenAiLayerConfig,
  type AiProvider,
  type ResolvedModelLayerConfig
} from "../src/lib/effect-ai/layers.js"
import { buildPrompt } from "../src/lib/effect-ai/prompt.js"
import { runGenerateText } from "../src/lib/effect-ai/run.js"
import { mergeBab, MergeValidationError } from "./lib/merge-bab.js"
import { extractPageRange, loadPdfDocument, planChunks } from "./lib/pdf-split.js"

/**
 * One-off extraction of Kemendikdasmen textbook PDFs to curriculum markdown (`pnpm curriculum:extract`).
 * Uses `@effect/ai-anthropic` via `runGenerateText` + PDF file parts (same stack as runtime API).
 */

const DEFAULT_EXTRACT_MAX_TOKENS = 16_384
const MIN_RETRY_PAGES = 5

function resolveExtractMaxTokens(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env["CURRICULUM_EXTRACT_MAX_TOKENS"]?.trim()
  if (raw === undefined || raw === "") return DEFAULT_EXTRACT_MAX_TOKENS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1024) {
    throw new CurriculumExtractConfigError({
      message: `CURRICULUM_EXTRACT_MAX_TOKENS must be an integer ≥ 1024, got "${raw}"`
    })
  }
  return parsed
}

class CurriculumExtractConfigError extends Data.TaggedError("CurriculumExtractConfigError")<{
  message: string
}> {}

class CurriculumExtractBookError extends Data.TaggedError("CurriculumExtractBookError")<{
  message: string
}> {}

class CurriculumExtractRunError extends Data.TaggedError("CurriculumExtractRunError")<{
  message: string
  failed: ReadonlyArray<{ slug: string; error: string }>
}> {}

interface BookSpec {
  slug: string
  subjectKey: ExamSubject
  subject: string
  grade: number
  pdfFilename: string
}

interface BookInput {
  subjectKey: ExamSubject
  subject: string
  grade: number
  pdfFilename: string
}

function defineBook(input: BookInput): BookSpec {
  return { ...input, slug: curriculumMdFilename(input.subjectKey, input.grade).replace(/\.md$/, "") }
}

const BOOKS: Array<BookSpec> = [
  defineBook({
    subjectKey: "bahasa_indonesia",
    subject: "Bahasa Indonesia",
    grade: 5,
    pdfFilename: "Indonesia_BS_KLS_V_Rev.pdf"
  }),
  defineBook({
    subjectKey: "bahasa_indonesia",
    subject: "Bahasa Indonesia",
    grade: 6,
    pdfFilename: "Bahasa-Indonesia-BS-KLS-VI_compressed.pdf"
  }),
  defineBook({
    subjectKey: "pendidikan_pancasila",
    subject: "Pendidikan Pancasila",
    grade: 5,
    pdfFilename: "Pendidikan-Pancasila-BS-KLS-V.pdf"
  }),
  defineBook({
    subjectKey: "pendidikan_pancasila",
    subject: "Pendidikan Pancasila",
    grade: 6,
    pdfFilename: "Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf"
  }),
  defineBook({
    subjectKey: "ipas",
    subject: "IPAS",
    grade: 5,
    pdfFilename: "IPAS_BS_KLS_V_Rev.pdf"
  }),
  defineBook({
    subjectKey: "ipas",
    subject: "IPAS",
    grade: 6,
    pdfFilename: "IPAS_BS_KLS_VI_Rev.pdf"
  }),
  defineBook({
    subjectKey: "bahasa_inggris",
    subject: "Bahasa Inggris",
    grade: 5,
    pdfFilename: "Inggris_FN_BS_KLS_V.pdf"
  }),
  defineBook({
    subjectKey: "bahasa_inggris",
    subject: "Bahasa Inggris",
    grade: 6,
    pdfFilename: "Inggris_FN_BS_KLS_VI.pdf"
  }),
  defineBook({
    subjectKey: "matematika",
    subject: "Matematika",
    grade: 5,
    pdfFilename: "Matematika-BS-KLS-V.pdf"
  }),
  defineBook({
    subjectKey: "matematika",
    subject: "Matematika",
    grade: 6,
    pdfFilename: "Matematika_BS_KLS_VI.pdf"
  })
]

const EXTRACTION_SYSTEM_PROMPT = `Anda adalah ekstraktor konten kurikulum. Konversi PDF Buku Siswa Kurikulum Merdeka
menjadi markdown TERSTRUKTUR sesuai skema ketat berikut. Jangan tambahkan komentar,
opini, atau pengantar — hanya markdown.

# {Mata Pelajaran} — Kelas {N} (Fase C, Kurikulum Merdeka)

## Capaian Pembelajaran
- Menyimak: ...
- Membaca dan Memirsa: ...
- Berbicara dan Mempresentasikan: ...
- Menulis: ...

## Bab {n}: {Judul}
**Topik utama:** ...
**Sub-konsep:**
- ...
**Teks bacaan:** |
  {teks utuh dari buku — cerita/informasi lengkap per bab, verbatim sebisa mungkin}
  {beberapa paragraf diperbolehkan; jangan ringkas atau parafrase}
**Kosakata kunci:** kata1, kata2, kata3
**Kompetensi yang diuji:** apa yang siswa harus bisa lakukan setelah bab ini

Aturan Teks bacaan:
- Salin seluruh teks bacaan/narasi/informasi yang muncul di bab (bukan cuplikan 2-4 kalimat).
- Jangan mengarang teks yang tidak ada di PDF.
- Abaikan petunjuk guru, LKPD kosong, dan glosarium.

(ulangi blok Bab untuk setiap bab dalam PDF)`

const FALLBACK_MERGE_SYSTEM_PROMPT =
  "Anda adalah konsolidator markdown kurikulum. Output HANYA markdown akhir, tanpa pengantar."

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PDF_DIR = join(SCRIPT_DIR, "..", "src", "curriculum", "pdf")
const MD_DIR = join(SCRIPT_DIR, "..", "src", "curriculum", "md")
const CACHE_DIR = join(SCRIPT_DIR, "..", "src", "curriculum", "cache")

interface FailureEntry {
  startPage: number
  endPage: number
  error: string
  at: string
}

function chunkInstruction(book: BookSpec, startPage: number, endPage: number, totalPages: number): string {
  return `Ini adalah potongan halaman ${startPage}-${endPage} dari ${totalPages} halaman Buku Siswa
${book.subject} Kelas ${book.grade}.

- Jika potongan ini berisi awal buku: keluarkan header H1 + section Capaian Pembelajaran.
- Untuk potongan tengah/akhir: LANGSUNG mulai dari Bab yang muncul di potongan ini, JANGAN ulangi header.
- Jika ada Bab yang melintasi batas potongan, ekstrak bagian yang TERLIHAT di potongan ini saja —
  proses merge akan menyatukan dengan potongan lain.
- Abaikan halaman pengantar penerbit, daftar isi, dan glosarium.`
}

function fallbackMergePrompt(book: BookSpec, draft: string): string {
  return `Berikut adalah hasil ekstraksi gabungan dari beberapa chunk PDF Buku Siswa
${book.subject} Kelas ${book.grade}. Ada kemungkinan duplikasi Bab karena overlap halaman antar chunk.

Tugas: konsolidasikan menjadi satu markdown bersih:
1. Hapus duplikasi Bab (jika "Bab 3" muncul dua kali, gabungkan kontennya — pilih versi
   paling lengkap untuk setiap field).
2. Urutkan Bab secara numerik.
3. Pertahankan skema ketat (header H1, Capaian Pembelajaran, blok Bab).
4. Jangan menambah konten — hanya konsolidasi.

Output HANYA markdown akhir, tanpa pengantar.

--- DRAFT GABUNGAN ---
${draft}`
}

function errorMessage(err: unknown): string {
  if (err instanceof AiGenerationError) {
    return typeof err.cause === "string" ? err.cause : String(err.cause)
  }
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

async function generateMarkdown(
  pdfModelLayer: Layer.Layer<LanguageModel.LanguageModel>,
  system: string,
  user: string,
  options: { model: string; provider: AiProvider; pdfBytes?: Buffer }
): Promise<string> {
  return Effect.runPromise(
    runGenerateText({
      modelLayer: pdfModelLayer,
      prompt: buildPrompt({
        system,
        user,
        ...(options.pdfBytes !== undefined ? { pdfBytes: options.pdfBytes } : {})
      }),
      model: options.model,
      logEvent: "curriculum.extract",
      errorContext: { provider: options.provider }
    })
  )
}

function resolveExtractLayerConfig(env: NodeJS.ProcessEnv = process.env): ResolvedModelLayerConfig {
  const provider = (env["AI_PROVIDER"] ?? "anthropic").toLowerCase()
  if (provider === "openai") return resolveOpenAiLayerConfig(env)
  if (provider === "minimax") return resolveMinimaxLayerConfig(env)
  if (provider === "anthropic") return resolveAnthropicLayerConfig(env)
  throw new CurriculumExtractConfigError({
    message: `AI_PROVIDER must be "anthropic", "minimax", or "openai", got "${provider}"`
  })
}

function cachePathFor(slug: string, startPage: number, endPage: number): string {
  return join(CACHE_DIR, slug, `pages-${startPage}-${endPage}.md`)
}

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, contents, "utf-8")
  await rename(tmp, path)
}

/**
 * Detect Anthropic errors that indicate the request payload exceeded the
 * model's context window so the caller can recover by halving the page range.
 */
function isPromptTooLong(err: unknown): boolean {
  const message = errorMessage(err)
  return /prompt is too long|too large|exceeds|context length|too many tokens/i.test(message)
}

function isFailureEntry(value: unknown): value is FailureEntry {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v["startPage"] === "number" &&
    typeof v["endPage"] === "number" &&
    typeof v["error"] === "string" &&
    typeof v["at"] === "string"
  )
}

async function readFailures(path: string): Promise<Array<FailureEntry>> {
  let raw: string
  try {
    raw = await readFile(path, "utf-8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
    throw err
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isFailureEntry) : []
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.warn(`[curriculum] corrupt failures.json at ${path} — starting fresh: ${err.message}`)
      return []
    }
    throw err
  }
}

async function recordFailure(slug: string, entry: FailureEntry): Promise<void> {
  const path = join(CACHE_DIR, slug, "failures.json")
  const existing = await readFailures(path)
  existing.push(entry)
  await writeFileAtomic(path, `${JSON.stringify(existing, null, 2)}\n`)
}

/**
 * Extract markdown for an inclusive page range, using the on-disk cache when
 * possible and recursively halving the range when Anthropic reports the
 * prompt is too long. Returns the assembled markdown for the range.
 */
async function readCachedChunk(cachePath: string): Promise<string | null> {
  try {
    const contents = await readFile(cachePath, "utf-8")
    if (contents.trim().length === 0) return null
    return contents
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null
    throw err
  }
}

async function extractChunkMarkdown(
  pdfModelLayer: Layer.Layer<LanguageModel.LanguageModel>,
  ai: { model: string; provider: AiProvider },
  book: BookSpec,
  src: PDFDocument,
  totalPages: number,
  startPage: number,
  endPage: number,
  cacheStats: { hits: number; total: number }
): Promise<string> {
  const cachePath = cachePathFor(book.slug, startPage, endPage)
  cacheStats.total += 1
  const cached = await readCachedChunk(cachePath)
  if (cached !== null) {
    cacheStats.hits += 1
    return cached
  }

  const pdfBytes = await extractPageRange(src, startPage, endPage)
  const sizeMb = (pdfBytes.byteLength / (1024 * 1024)).toFixed(1)
  process.stdout.write(
    `[${book.slug}] pages ${startPage}-${endPage} (${endPage - startPage + 1}p, ${sizeMb} MB) → `
  )

  try {
    const text = await generateMarkdown(
      pdfModelLayer,
      EXTRACTION_SYSTEM_PROMPT,
      chunkInstruction(book, startPage, endPage, totalPages),
      { model: ai.model, provider: ai.provider, pdfBytes: Buffer.from(pdfBytes) }
    )
    console.log(`${text.length} chars`)
    await writeFileAtomic(cachePath, text)
    return text
  } catch (err) {
    const isEmpty = errorMessage(err).includes("no text block")
    if (!isPromptTooLong(err) && !isEmpty) throw err

    const pages = endPage - startPage + 1
    if (pages <= MIN_RETRY_PAGES) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`\n[${book.slug}] irreducible failure pages ${startPage}-${endPage}: ${message}`)
      await recordFailure(book.slug, {
        startPage,
        endPage,
        error: message,
        at: new Date().toISOString()
      })
      throw err
    }

    const mid = startPage + Math.floor(pages / 2) - 1
    const reason = isEmpty ? "empty response" : "prompt too long"
    console.warn(
      `\n[${book.slug}] ${reason} for pages ${startPage}-${endPage}, halving into ${startPage}-${mid} + ${
        mid + 1
      }-${endPage}`
    )
    const left = await extractChunkMarkdown(pdfModelLayer, ai, book, src, totalPages, startPage, mid, cacheStats)
    const right = await extractChunkMarkdown(pdfModelLayer, ai, book, src, totalPages, mid + 1, endPage, cacheStats)
    const combined = `${left.trimEnd()}\n\n${right.trimStart()}`
    await writeFileAtomic(cachePath, combined)
    return combined
  }
}

async function extractBook(
  pdfModelLayer: Layer.Layer<LanguageModel.LanguageModel>,
  ai: { model: string; provider: AiProvider },
  book: BookSpec
): Promise<void> {
  const pdfPath = join(PDF_DIR, book.pdfFilename)
  if (!existsSync(pdfPath)) {
    console.warn(`[${book.slug}] missing source PDF: ${pdfPath} — skipping`)
    return
  }

  console.log(`[${book.slug}] planning chunks for ${book.pdfFilename}…`)
  const src = await loadPdfDocument(pdfPath)
  const chunks = planChunks(src)
  const totalPages = src.getPageCount()
  console.log(`[${book.slug}] ${chunks.length} planned chunk(s), ${totalPages} pages`)

  const cacheStats = { hits: 0, total: 0 }
  const chunkOutputs: Array<string> = []
  for (const chunk of chunks) {
    const text = await extractChunkMarkdown(
      pdfModelLayer,
      ai,
      book,
      src,
      totalPages,
      chunk.startPage,
      chunk.endPage,
      cacheStats
    )
    chunkOutputs.push(text)
  }
  if (cacheStats.hits > 0) {
    console.log(`[${book.slug}] cache: ${cacheStats.hits}/${cacheStats.total} chunks reused`)
  }

  const concatenated = chunkOutputs.join("\n\n")
  let merged: string
  try {
    merged = mergeBab(concatenated)
    console.log(`[${book.slug}] deterministic merge ok`)
  } catch (err) {
    if (!(err instanceof MergeValidationError)) throw err
    console.warn(`[${book.slug}] deterministic merge failed (${err.message}) — falling back to LLM consolidation`)
    merged = await generateMarkdown(pdfModelLayer, FALLBACK_MERGE_SYSTEM_PROMPT, fallbackMergePrompt(book, concatenated), {
      model: ai.model,
      provider: ai.provider
    })
  }

  await mkdir(MD_DIR, { recursive: true })
  const outPath = join(MD_DIR, `${book.slug}.md`)
  await writeFile(outPath, `${merged.trimEnd()}\n`, "utf-8")
  console.log(`[${book.slug}] wrote ${outPath} (${merged.length} chars)`)
}

function parseArgs(argv: ReadonlyArray<string>): { bookFilter: string | null } {
  let bookFilter: string | null = null
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--book") {
      bookFilter = argv[i + 1] ?? null
      i += 1
    } else if (arg !== undefined && arg.startsWith("--book=")) {
      bookFilter = arg.slice("--book=".length)
    }
  }
  return { bookFilter }
}

const main = Effect.gen(function*() {
  const resolved = yield* Effect.try({
    try: () => resolveExtractLayerConfig(),
    catch: (error: unknown) =>
      new CurriculumExtractConfigError({
        message: error instanceof Error ? error.message : String(error)
      })
  })
  const maxTokens = resolveExtractMaxTokens()
  const pdfModelLayer = createModelLayersFromResolved({
    ...resolved,
    maxTokens,
    discussionMaxTokens: maxTokens,
    validationMaxTokens: maxTokens
  }).pdf
  const ai = { model: resolved.pdfModel, provider: resolved.provider }
  yield* Effect.sync(() => {
    console.log(
      `[curriculum:extract] provider=${resolved.provider} model=${resolved.pdfModel} maxTokens=${maxTokens}`
    )
  })

  const { bookFilter } = parseArgs(process.argv.slice(2))
  const targets = bookFilter ? BOOKS.filter((b) => b.slug === bookFilter) : BOOKS
  if (targets.length === 0) {
    return yield* Effect.die(
      new CurriculumExtractConfigError({
        message: `unknown --book "${bookFilter}". Known: ${BOOKS.map((b) => b.slug).join(", ")}`
      })
    )
  }

  const failed: Array<{ slug: string; error: string }> = []
  for (const book of targets) {
    yield* Effect.tryPromise({
      try: () => extractBook(pdfModelLayer, ai, book),
      catch: (error: unknown) => new CurriculumExtractBookError({ message: errorMessage(error) })
    }).pipe(
      Effect.catchAll((err) =>
        Effect.sync(() => {
          const message = err.message
          console.error(`[${book.slug}] failed: ${message}`)
          failed.push({ slug: book.slug, error: message })
        })
      )
    )
  }
  if (failed.length > 0) {
    yield* Effect.sync(() => {
      console.error(`\n${failed.length} book(s) failed: ${failed.map((f) => f.slug).join(", ")}`)
      console.error("Cached chunks were preserved — re-run to resume.")
    })
    return yield* Effect.die(
      new CurriculumExtractRunError({
        message: `${failed.length} book(s) failed`,
        failed
      })
    )
  }
  yield* Effect.sync(() => {
    console.log("done.")
  })
})

NodeRuntime.runMain(main)
