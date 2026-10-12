const SUBJECT_LABELS: Record<string, string> = {
  bahasa_indonesia: "Bahasa Indonesia",
  pendidikan_pancasila: "Pendidikan Pancasila",
  ipas: "IPAS",
  bahasa_inggris: "Bahasa Inggris",
  matematika: "Matematika"
}

export const OG_IMAGE_PATH = "/og.png"

const OG_TYPE = "website"
const OG_LOCALE = "id_ID"

export const LANDING_DESCRIPTION =
  "Lembar ujian siap cetak untuk SD. Susun soal Kurikulum Merdeka kelas 1–6 dan unduh PDF."

export interface SharePreviewInput {
  title: string
  subjectLabel: string
  grade: number
  origin: string
  slug: string
}

export interface SharePreviewMeta {
  title: string
  description: string
  imageUrl: string
  pageUrl: string
}

export function previewSubjectLabel(subject: string | null, subjectLabel: string | null): string {
  const custom = subjectLabel?.trim() ?? ""
  if (custom !== "") return custom
  if (subject !== null && subject !== "") {
    return SUBJECT_LABELS[subject] ?? subject
  }
  return "Mata Pelajaran"
}

export function sharePreviewFromExam(input: SharePreviewInput): SharePreviewMeta {
  const origin = input.origin.replace(/\/$/, "")
  const title = input.title.trim()
  return {
    title,
    description: `${title}. ${input.subjectLabel} Kelas ${input.grade} SD. Lembar ujian siap cetak.`,
    imageUrl: `${origin}${OG_IMAGE_PATH}`,
    pageUrl: `${origin}/share/${input.slug}`
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export function injectSharePreview(html: string, meta: SharePreviewMeta): string {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const imageUrl = escapeHtml(meta.imageUrl)
  const pageUrl = escapeHtml(meta.pageUrl)
  const withoutPreview = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(
      /<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image|og:url|og:type|og:locale|twitter:card)"[^>]*>\s*/gi,
      ""
    )
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
  const tags = [
    `<meta name="description" content="${description}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    `<meta property="og:type" content="${OG_TYPE}" />`,
    `<meta property="og:locale" content="${OG_LOCALE}" />`,
    `<link rel="canonical" href="${pageUrl}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`
  ].join("\n    ")
  return withoutPreview.replace(/<\/head>/i, `    ${tags}\n  </head>`)
}

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`
  const existing = document.head.querySelector(selector)
  if (existing) {
    existing.setAttribute("content", content)
    return
  }
  const meta = document.createElement("meta")
  meta.setAttribute(attr, key)
  meta.setAttribute("content", content)
  document.head.append(meta)
}

function upsertLink(rel: string, href: string): void {
  const selector = `link[rel="${rel}"]`
  const existing = document.head.querySelector(selector)
  if (existing) {
    existing.setAttribute("href", href)
    return
  }
  const link = document.createElement("link")
  link.setAttribute("rel", rel)
  link.setAttribute("href", href)
  document.head.append(link)
}

export function applyDocumentPreview(meta: SharePreviewMeta): void {
  document.title = meta.title
  upsertMeta("name", "description", meta.description)
  upsertMeta("property", "og:title", meta.title)
  upsertMeta("property", "og:description", meta.description)
  upsertMeta("property", "og:image", meta.imageUrl)
  upsertMeta("property", "og:url", meta.pageUrl)
  upsertMeta("property", "og:type", OG_TYPE)
  upsertMeta("property", "og:locale", OG_LOCALE)
  upsertLink("canonical", meta.pageUrl)
  upsertMeta("name", "twitter:card", "summary_large_image")
}
