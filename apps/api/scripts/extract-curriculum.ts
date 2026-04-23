import Anthropic from '@anthropic-ai/sdk'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PDFDocument } from 'pdf-lib'
import type { ExamSubject } from '@teacher-exam/shared'
import { extractPageRange, loadPdfDocument, planChunks } from './lib/pdf-split'
import { mergeBab, MergeValidationError } from './lib/merge-bab'
import { curriculumMdFilename } from '../src/lib/curriculum'

const MODEL = 'claude-opus-4-7'
const MAX_TOKENS = 8192
const MIN_RETRY_PAGES = 5

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
  return { ...input, slug: curriculumMdFilename(input.subjectKey, input.grade).replace(/\.md$/, '') }
}

const BOOKS: BookSpec[] = [
  defineBook({
    subjectKey: 'bahasa_indonesia',
    subject: 'Bahasa Indonesia',
    grade: 5,
    pdfFilename: 'Indonesia_BS_KLS_V_Rev.pdf',
  }),
  defineBook({
    subjectKey: 'bahasa_indonesia',
    subject: 'Bahasa Indonesia',
    grade: 6,
    pdfFilename: 'Bahasa-Indonesia-BS-KLS-VI_compressed.pdf',
  }),
  defineBook({
    subjectKey: 'pendidikan_pancasila',
    subject: 'Pendidikan Pancasila',
    grade: 5,
    pdfFilename: 'Pendidikan-Pancasila-BS-KLS-V.pdf',
  }),
  defineBook({
    subjectKey: 'pendidikan_pancasila',
    subject: 'Pendidikan Pancasila',
    grade: 6,
    pdfFilename: 'Pendidikan-Pancasila-BS-KLS-VI-Rev.pdf',
  }),
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
**Sample teks bacaan:** "kutipan singkat 2-4 kalimat dari buku"
**Kosakata kunci:** kata1, kata2, kata3
**Kompetensi yang diuji:** apa yang siswa harus bisa lakukan setelah bab ini

(ulangi blok Bab untuk setiap bab dalam PDF)`

const FALLBACK_MERGE_SYSTEM_PROMPT = 'Anda adalah konsolidator markdown kurikulum. Output HANYA markdown akhir, tanpa pengantar.'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PDF_DIR = join(SCRIPT_DIR, '..', 'src', 'curriculum', 'pdf')
const MD_DIR = join(SCRIPT_DIR, '..', 'src', 'curriculum', 'md')
const CACHE_DIR = join(SCRIPT_DIR, '..', 'src', 'curriculum', 'cache')

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

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

function cachePathFor(slug: string, startPage: number, endPage: number): string {
  return join(CACHE_DIR, slug, `pages-${startPage}-${endPage}.md`)
}

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, contents, 'utf-8')
  await rename(tmp, path)
}

/**
 * Detect Anthropic errors that indicate the request payload exceeded the
 * model's context window so the caller can recover by halving the page range.
 */
function isPromptTooLong(err: unknown): boolean {
  if (!(err instanceof Anthropic.APIError)) return false
  if (err.status !== 400 && err.status !== 413) return false
  const message = String(err.message ?? '')
  return /prompt is too long|too large|exceeds|context length|too many tokens/i.test(message)
}

function isFailureEntry(value: unknown): value is FailureEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v['startPage'] === 'number' &&
    typeof v['endPage'] === 'number' &&
    typeof v['error'] === 'string' &&
    typeof v['at'] === 'string'
  )
}

async function readFailures(path: string): Promise<FailureEntry[]> {
  let raw: string
  try {
    raw = await readFile(path, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
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
  const path = join(CACHE_DIR, slug, 'failures.json')
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
    const contents = await readFile(cachePath, 'utf-8')
    if (contents.trim().length === 0) return null
    return contents
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

/**
 * Soft failure raised when Anthropic returns 200 with no text content. We
 * route it through the same halve-and-retry path used for context overflow.
 */
class EmptyResponseError extends Error {
  constructor(public readonly startPage: number, public readonly endPage: number) {
    super(`empty response for pages ${startPage}-${endPage}`)
    this.name = 'EmptyResponseError'
  }
}

async function extractChunkMarkdown(
  client: Anthropic,
  book: BookSpec,
  src: PDFDocument,
  totalPages: number,
  startPage: number,
  endPage: number,
  cacheStats: { hits: number; total: number },
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
    `[${book.slug}] pages ${startPage}-${endPage} (${endPage - startPage + 1}p, ${sizeMb} MB) → `,
  )

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBytes.toString('base64'),
              },
            },
            { type: 'text', text: chunkInstruction(book, startPage, endPage, totalPages) },
          ],
        },
      ],
    })
    const text = extractText(response.content)
    console.log(`${text.length} chars`)
    if (text.trim().length === 0) {
      throw new EmptyResponseError(startPage, endPage)
    }
    await writeFileAtomic(cachePath, text)
    return text
  } catch (err) {
    const isEmpty = err instanceof EmptyResponseError
    if (!isPromptTooLong(err) && !isEmpty) throw err

    const pages = endPage - startPage + 1
    if (pages <= MIN_RETRY_PAGES) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`\n[${book.slug}] irreducible failure pages ${startPage}-${endPage}: ${message}`)
      await recordFailure(book.slug, {
        startPage,
        endPage,
        error: message,
        at: new Date().toISOString(),
      })
      throw err
    }

    const mid = startPage + Math.floor(pages / 2) - 1
    const reason = isEmpty ? 'empty response' : 'prompt too long'
    console.warn(
      `\n[${book.slug}] ${reason} for pages ${startPage}-${endPage}, halving into ${startPage}-${mid} + ${mid + 1}-${endPage}`,
    )
    const left = await extractChunkMarkdown(client, book, src, totalPages, startPage, mid, cacheStats)
    const right = await extractChunkMarkdown(client, book, src, totalPages, mid + 1, endPage, cacheStats)
    const combined = `${left.trimEnd()}\n\n${right.trimStart()}`
    await writeFileAtomic(cachePath, combined)
    return combined
  }
}

async function extractBook(client: Anthropic, book: BookSpec): Promise<void> {
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
  const chunkOutputs: string[] = []
  for (const chunk of chunks) {
    const text = await extractChunkMarkdown(
      client,
      book,
      src,
      totalPages,
      chunk.startPage,
      chunk.endPage,
      cacheStats,
    )
    chunkOutputs.push(text)
  }
  if (cacheStats.hits > 0) {
    console.log(`[${book.slug}] cache: ${cacheStats.hits}/${cacheStats.total} chunks reused`)
  }

  const concatenated = chunkOutputs.join('\n\n')
  let merged: string
  try {
    merged = mergeBab(concatenated)
    console.log(`[${book.slug}] deterministic merge ok`)
  } catch (err) {
    if (!(err instanceof MergeValidationError)) throw err
    console.warn(`[${book.slug}] deterministic merge failed (${err.message}) — falling back to LLM consolidation`)
    const fallback = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: FALLBACK_MERGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: fallbackMergePrompt(book, concatenated) }],
    })
    merged = extractText(fallback.content)
  }

  await mkdir(MD_DIR, { recursive: true })
  const outPath = join(MD_DIR, `${book.slug}.md`)
  await writeFile(outPath, `${merged.trimEnd()}\n`, 'utf-8')
  console.log(`[${book.slug}] wrote ${outPath} (${merged.length} chars)`)
}

function parseArgs(argv: readonly string[]): { bookFilter: string | null } {
  let bookFilter: string | null = null
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--book') {
      bookFilter = argv[i + 1] ?? null
      i += 1
    } else if (arg !== undefined && arg.startsWith('--book=')) {
      bookFilter = arg.slice('--book='.length)
    }
  }
  return { bookFilter }
}

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey || apiKey.includes('your-api-key')) {
    throw new Error('ANTHROPIC_API_KEY missing or placeholder — set it in the root .env file before running.')
  }
  const { bookFilter } = parseArgs(process.argv.slice(2))
  const targets = bookFilter ? BOOKS.filter((b) => b.slug === bookFilter) : BOOKS
  if (targets.length === 0) {
    throw new Error(`unknown --book "${bookFilter}". Known: ${BOOKS.map((b) => b.slug).join(', ')}`)
  }

  const client = new Anthropic({ apiKey })
  const failed: Array<{ slug: string; error: string }> = []
  for (const book of targets) {
    try {
      await extractBook(client, book)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[${book.slug}] failed: ${message}`)
      failed.push({ slug: book.slug, error: message })
    }
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length} book(s) failed: ${failed.map((f) => f.slug).join(', ')}`)
    console.error('Cached chunks were preserved — re-run to resume.')
    process.exit(1)
  }
  console.log('done.')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
