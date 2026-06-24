import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { basename, resolve, sep } from "node:path"
import { DEFAULT_CURRICULUM_PDF_DIR } from "./curriculum-report.js"

const API_BASE_URL = "https://api.buku.cloudapp.web.id/api/catalogue"
const TEXTBOOK_PAGE_LIMIT = 100
const MAX_CRAWL_STEPS = 120
const REQUEST_TIMEOUT_MS = 12_000
const TEXTBOOK_REQUEST_TIMEOUT_MS = 45_000
const DOWNLOAD_TIMEOUT_MS = 60_000
const TEXTBOOK_PAGE_CONCURRENCY = 4

const OFFICIAL_PDF_HOSTS = new Set([
  "static.sc.cloudapp.web.id",
  "static-sc.cloudapp.web.id",
  "static.buku.kemendikdasmen.go.id",
  "static.buku.kemdikbud.go.id"
])

const SCOPE_SUBJECTS = new Set([
  "agama_buddha",
  "agama_hindu",
  "agama_islam",
  "agama_katolik",
  "agama_khonghucu",
  "agama_kristen",
  "bahasa_indonesia",
  "bahasa_inggris",
  "ipas",
  "matematika",
  "pendidikan_pancasila",
  "pjok",
  "seni_musik",
  "seni_rupa",
  "seni_tari",
  "seni_teater"
])

export const DEFAULT_SEED_SLUGS = [
  "bahasa-indonesia-aku-bisa-untuk-sd-mi-kelas-i-edisi-revisi",
  "bahasa-indonesia-keluargaku-unik-untuk-sd-mi-kelas-ii-edisi-revisi",
  "bahasa-indonesia-kawan-seiring-untuk-sdmi-kelas-iii-edisi-revisi",
  "bahasa-indonesia-lihat-sekitar-untuk-sdmi-kelas-iv-edisi-revisi",
  "bahasa-indonesia-bergerak-bersama-untuk-sd-mi-kelas-v-edisi-revisi",
  "bahasa-indonesia-anak-anak-yang-mengubah-dunia-untuk-sdmi-kelas-vi",
  "bahasa-indonesia-anak-anak-yang-mengubah-dunia-untuk-sdmi-kelas-vi-edisi-revisi",
  "bahasa-inggris-english-for-nusantara-kids-untuk-sd-mi-kelas-iii",
  "bahasa-inggris-english-for-nusantara-kids-untuk-sd-mi-kelas-iv",
  "bahasa-inggris-english-for-nusantara-kids-untuk-sd-mi-kelas-v",
  "bahasa-inggris-english-for-nusantara-kids-untuk-sd-mi-kelas-vi",
  "ilmu-pengetahuan-alam-dan-sosial-untuk-sd-mi-kelas-iv-edisi-revisi",
  "ilmu-pengetahuan-alam-dan-sosial-untuk-sd-mi-kelas-v-edisi-revisi",
  "ilmu-pengetahuan-alam-dan-sosial-untuk-sdmi-kelas-iii-edisi-revisi",
  "ilmu-pengetahuan-alam-dan-sosial-untuk-sdmi-kelas-vi-edisi-revisi",
  "pendidikan-pancasila-untuk-sdmi-kelas-i",
  "pendidikan-pancasila-untuk-sdmi-kelas-ii",
  "pendidikan-pancasila-untuk-sdmi-kelas-iii",
  "pendidikan-pancasila-untuk-sdmi-kelas-iv",
  "pendidikan-pancasila-untuk-sdmi-kelas-v",
  "pendidikan-pancasila-untuk-sdmi-kelas-vi",
  "Matematika-untuk-SDMI-Kelas-I",
  "Matematika-untuk-SDMI-Kelas-II",
  "matematika-untuk-sdmi-kelas-iii",
  "Matematika-untuk-SDMI-Kelas-IV",
  "Matematika-untuk-SDMI-Kelas-V",
  "matematika-untuk-sdmi-kelas-vi",
  "pendidikan-agama-islam-dan-budi-pekerti-untuk-sd-kelas-i",
  "pendidikan-agama-islam-dan-budi-pekerti-untuk-sdmi-kelas-iii",
  "pendidikan-agama-islam-dan-budi-pekerti-untuk-sdmi-kelas-vi",
  "pendidikan-agama-buddha-dan-budi-pekerti-untuk-sd-kelas-i",
  "pendidikan-agama-buddha-dan-budi-pekerti-untuk-sd-kelas-iv",
  "pendidikan-jasmani-olahraga-dan-kesehatan-untuk-sd-mi-kelas-i",
  "pendidikan-jasmani-olahraga-dan-kesehatan-untuk-sd-mi-kelas-iv",
  "pendidikan-jasmani-olahraga-dan-kesehatan-untuk-sdmi-kelas-v"
] as const

export interface SibiCatalogueItem {
  title?: string | null
  slug?: string | null
  attachment?: string | null
  class?: string | null
  level?: string | null
  subject?: string | null
  type?: string | null
  book_type?: string | null
  taxonomy_name?: string | null
}

export interface ClassifiedCatalogueItem {
  item: SibiCatalogueItem
  reason: "keep" | string
  grade: number | null
  subjectKey: string | null
  filename: string | null
}

export interface DownloadCandidate {
  title: string
  slug: string | null
  subjectKey: string
  grade: number
  sourceUrl: string
  attachment: string
  filename: string
  status: "downloaded" | "skipped_existing" | "dry_run" | "failed"
  message: string
}

interface CrawlResult {
  kept: ReadonlyArray<DownloadCandidate>
  rejected: ReadonlyArray<ClassifiedCatalogueItem>
}

interface DownloadOptions {
  dryRun?: boolean
  force?: boolean
  pdfDir?: string
  fetchImpl?: typeof fetch
}

interface SibiListResponse {
  results?: unknown
  totalSize?: unknown
}

function normalizeSubject(subject: string | null | undefined): string | null {
  if (subject === null || subject === undefined || subject.trim() === "") return null
  return subject.trim().toLowerCase()
}

function normalizeTitle(input: string | null | undefined): string {
  return (input ?? "").toLowerCase()
}

function normalizeText(input: string | null | undefined): string {
  return (input ?? "").trim().toLowerCase()
}

function gradeFromItem(item: SibiCatalogueItem): number | null {
  const raw = item.class?.trim()
  if (raw !== undefined && /^[1-6]$/.test(raw)) return Number.parseInt(raw, 10)
  const title = normalizeTitle(item.title)
  const romanMatch = title.match(/\bkelas\s+(i|ii|iii|iv|v|vi)\b/i)
  if (!romanMatch) return null
  const roman = romanMatch[1]?.toUpperCase()
  const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }
  return roman === undefined ? null : map[roman] ?? null
}

function hasExcludedTitle(title: string): boolean {
  return (
    /panduan guru|buku panduan guru|buku audio|interaktif|panduan pembelajaran/.test(title) ||
    /\bbuku kelas\s+(i|ii|iii|iv|v|vi|[1-6])\s+tema\b/.test(title)
  )
}

export function isOfficialSibiPdfUrl(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return OFFICIAL_PDF_HOSTS.has(url.hostname) && url.pathname.toLowerCase().endsWith(".pdf") &&
    url.pathname.includes("/content/pdf/")
}

export function filenameFromAttachment(value: string): string {
  const url = new URL(value)
  return sanitizePdfFilename(decodeURIComponent(basename(url.pathname)))
}

function sanitizePdfFilename(value: string): string {
  const filename = value.trim()
  if (
    filename.length === 0 ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !filename.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("unsafe SIBI PDF filename")
  }
  return filename
}

function safeFilenameFromAttachment(value: string): string | null {
  try {
    return filenameFromAttachment(value)
  } catch {
    return null
  }
}

function normalizeAttachmentUrl(value: string): string {
  const url = new URL(value)
  if (url.hostname === "static.sc.cloudapp.web.id") {
    url.hostname = "static-sc.cloudapp.web.id"
  }
  return url.toString()
}

export function classifyCatalogueItem(item: SibiCatalogueItem): ClassifiedCatalogueItem {
  const title = normalizeTitle(item.title)
  const grade = gradeFromItem(item)
  const subjectKey = normalizeSubject(item.subject)
  const attachment = item.attachment
  const filename = isOfficialSibiPdfUrl(attachment) && attachment !== null && attachment !== undefined
    ? safeFilenameFromAttachment(attachment)
    : null

  if (hasExcludedTitle(title)) return { item, reason: "excluded_title", grade, subjectKey, filename }
  const bookType = normalizeText(item.book_type)
  if (bookType !== "buku_siswa" && bookType !== "buku pdf") {
    return { item, reason: "not_buku_siswa", grade, subjectKey, filename }
  }
  if (normalizeText(item.taxonomy_name) !== "buku pdf") {
    return { item, reason: "not_buku_pdf_taxonomy", grade, subjectKey, filename }
  }
  if (item.type !== "pdf") return { item, reason: "not_pdf_type", grade, subjectKey, filename }
  if (item.level !== "SD/MI") return { item, reason: "not_sd_mi", grade, subjectKey, filename }
  if (grade === null) return { item, reason: "not_grade_1_6", grade, subjectKey, filename }
  if (subjectKey === null || !SCOPE_SUBJECTS.has(subjectKey)) {
    return { item, reason: "out_of_scope_subject", grade, subjectKey, filename }
  }
  if (!isOfficialSibiPdfUrl(attachment)) {
    return { item, reason: "not_official_pdf_url", grade, subjectKey, filename }
  }
  if (filename === null) return { item, reason: "unsafe_pdf_filename", grade, subjectKey, filename }
  return { item, reason: "keep", grade, subjectKey, filename }
}

export function shouldKeepCatalogueItem(item: SibiCatalogueItem): boolean {
  return classifyCatalogueItem(item).reason === "keep"
}

async function fetchJson(fetchImpl: typeof fetch, url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetchImpl(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  if (!response.ok) throw new Error(`SIBI request failed ${response.status}: ${url}`)
  return response.json() as Promise<unknown>
}

async function fetchJsonWithRetry(fetchImpl: typeof fetch, url: string, init?: RequestInit): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetchJson(fetchImpl, url, init)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

async function fetchTextbookPage(fetchImpl: typeof fetch, offset: number): Promise<unknown> {
  const url =
    `${API_BASE_URL}/getPenggerakTextBooks?limit=${TEXTBOOK_PAGE_LIMIT}&offset=${offset}&type_pdf&order_by=updated_at`
  return fetchJsonWithRetry(fetchImpl, url, {
    signal: AbortSignal.timeout(TEXTBOOK_REQUEST_TIMEOUT_MS)
  })
}

function resultItems(value: unknown): Array<SibiCatalogueItem> {
  if (typeof value !== "object" || value === null) return []
  const results = (value as { results?: unknown }).results
  if (Array.isArray(results)) {
    return results.filter((item): item is SibiCatalogueItem => typeof item === "object" && item !== null)
  }
  if (typeof results === "object" && results !== null) return [results as SibiCatalogueItem]
  return []
}

function totalSizeFromResponse(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null
  const totalSize = (value as SibiListResponse).totalSize
  if (typeof totalSize === "number" && Number.isFinite(totalSize)) return totalSize
  if (typeof totalSize === "string" && /^\d+$/.test(totalSize)) return Number.parseInt(totalSize, 10)
  return null
}

async function collectFromSibi(fetchImpl: typeof fetch): Promise<CrawlResult> {
  const queue: Array<string> = [...DEFAULT_SEED_SLUGS]
  const seenSlugs = new Set<string>()
  const seenAttachments = new Set<string>()
  const kept = new Map<string, DownloadCandidate>()
  const rejected: Array<ClassifiedCatalogueItem> = []

  const addItems = (items: ReadonlyArray<SibiCatalogueItem>) => {
    for (const item of items) {
      if (item.slug !== null && item.slug !== undefined && !seenSlugs.has(item.slug)) queue.push(item.slug)
      const classified = classifyCatalogueItem(item)
      if (classified.reason !== "keep") {
        rejected.push(classified)
        continue
      }
      if (
        classified.filename === null ||
        classified.grade === null ||
        classified.subjectKey === null ||
        item.attachment === null ||
        item.attachment === undefined
      ) continue
      if (seenAttachments.has(item.attachment)) continue
      seenAttachments.add(item.attachment)
      const attachment = normalizeAttachmentUrl(item.attachment)
      kept.set(attachment, {
        title: item.title ?? classified.filename,
        slug: item.slug ?? null,
        subjectKey: classified.subjectKey,
        grade: classified.grade,
        sourceUrl: item.slug === undefined ? API_BASE_URL : `https://buku.kemendikdasmen.go.id/katalog/${item.slug}`,
        attachment,
        filename: classified.filename,
        status: "dry_run",
        message: "not downloaded"
      })
    }
  }

  try {
    const firstTextbookPage = await fetchTextbookPage(fetchImpl, 0)
    const firstTextbookItems = resultItems(firstTextbookPage)
    addItems(firstTextbookItems)

    const totalSize = totalSizeFromResponse(firstTextbookPage)
    const offsets = totalSize === null
      ? []
      : Array.from(
        { length: Math.ceil(totalSize / TEXTBOOK_PAGE_LIMIT) - 1 },
        (_, index) => (index + 1) * TEXTBOOK_PAGE_LIMIT
      )
    for (let index = 0; index < offsets.length; index += TEXTBOOK_PAGE_CONCURRENCY) {
      const batch = offsets.slice(index, index + TEXTBOOK_PAGE_CONCURRENCY)
      const pages = await Promise.allSettled(batch.map((offset) => fetchTextbookPage(fetchImpl, offset)))
      for (const page of pages) {
        if (page.status === "fulfilled") addItems(resultItems(page.value))
      }
    }
  } catch {
    // The seeded detail pages below are enough to continue when the full catalogue endpoint is slow.
  }

  try {
    addItems(resultItems(
      await fetchJsonWithRetry(fetchImpl, API_BASE_URL, {
        body: JSON.stringify({ filter: [] }),
        headers: { "content-type": "application/json" },
        method: "POST"
      })
    ))
  } catch {
    // The seeded detail pages below are enough to continue when the index endpoint is slow.
  }

  for (let i = 0; i < MAX_CRAWL_STEPS && queue.length > 0; i += 1) {
    const slug = queue.shift()
    if (slug === undefined || seenSlugs.has(slug)) continue
    seenSlugs.add(slug)
    const detailUrl = `${API_BASE_URL}/getDetails?slug=${encodeURIComponent(slug)}`
    const recommendUrl = `${API_BASE_URL}/getRecommendCatalogue?slug=${encodeURIComponent(slug)}&qty=80`
    const [detail, recommendations] = await Promise.allSettled([
      fetchJsonWithRetry(fetchImpl, detailUrl),
      fetchJson(fetchImpl, recommendUrl)
    ])
    if (detail.status === "fulfilled") addItems(resultItems(detail.value))
    if (recommendations.status === "fulfilled") addItems(resultItems(recommendations.value))
  }

  return {
    kept: [...kept.values()].sort((a, b) =>
      a.grade - b.grade || a.subjectKey.localeCompare(b.subjectKey) || a.title.localeCompare(b.title)
    ),
    rejected
  }
}

async function downloadCandidate(
  candidate: DownloadCandidate,
  options: Required<Pick<DownloadOptions, "dryRun" | "force" | "pdfDir" | "fetchImpl">>
): Promise<DownloadCandidate> {
  const pdfDir = resolve(options.pdfDir)
  const path = resolve(pdfDir, candidate.filename)
  if (path !== pdfDir && !path.startsWith(`${pdfDir}${sep}`)) {
    return { ...candidate, status: "failed", message: "unsafe output path" }
  }
  if (options.dryRun) return { ...candidate, status: "dry_run", message: path }
  if (!options.force && existsSync(path)) {
    return { ...candidate, status: "skipped_existing", message: path }
  }
  let response: Response
  let bytes: Uint8Array
  try {
    response = await options.fetchImpl(candidate.attachment, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
    })
    bytes = new Uint8Array(await response.arrayBuffer())
  } catch (error) {
    return {
      ...candidate,
      status: "failed",
      message: error instanceof Error ? error.message : "download request failed"
    }
  }
  if (!response.ok) {
    return { ...candidate, status: "failed", message: `download failed ${response.status}` }
  }
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("pdf") && !candidate.filename.toLowerCase().endsWith(".pdf")) {
    return { ...candidate, status: "failed", message: `unexpected content-type ${contentType}` }
  }
  if (bytes.length < 4 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    return { ...candidate, status: "failed", message: "downloaded file is not a PDF" }
  }
  await writeFile(path, bytes)
  return { ...candidate, status: "downloaded", message: path }
}

export async function collectAndDownloadSibiBooks(
  options: DownloadOptions = {}
): Promise<ReadonlyArray<DownloadCandidate>> {
  const resolved = {
    dryRun: options.dryRun ?? false,
    fetchImpl: options.fetchImpl ?? fetch,
    force: options.force ?? false,
    pdfDir: options.pdfDir ?? DEFAULT_CURRICULUM_PDF_DIR
  }
  await mkdir(resolved.pdfDir, { recursive: true })
  const crawl = await collectFromSibi(resolved.fetchImpl)
  const rows: Array<DownloadCandidate> = []
  for (const candidate of crawl.kept) {
    rows.push(await downloadCandidate(candidate, resolved))
  }
  return rows
}

export function formatDownloadInventory(rows: ReadonlyArray<DownloadCandidate>): string {
  const header = ["status", "grade", "subject", "filename", "title", "source"]
  const body = rows.map((row) => [
    row.status,
    String(row.grade),
    row.subjectKey,
    row.filename,
    row.title,
    row.sourceUrl
  ])
  return [header, ...body].map((cells) => cells.join("\t")).join("\n")
}
