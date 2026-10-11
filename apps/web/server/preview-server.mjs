import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { injectSharePreview, previewSubjectLabel, sharePreviewFromExam } from "./share-preview.ts"

const indexHtml = readFileSync(process.env["INDEX_HTML"] ?? "/srv/index.html", "utf8")
const apiBase = (process.env["API_INTERNAL_URL"] ?? "http://api:3001").replace(/\/$/, "")

const server = createServer((req, res) => {
  const pathOnly = (req.url ?? "/").split("?")[0] ?? "/"
  const match = pathOnly.match(/^\/share\/([A-Za-z0-9_-]+)\/?$/)
  if (!match) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
    res.end("not found")
    return
  }
  const slug = match[1] ?? ""
  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host ?? "ujian-sekolah.naufaldi.com"
  const host = Array.isArray(hostHeader) ? hostHeader[0] ?? "ujian-sekolah.naufaldi.com" : hostHeader
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1")
  const origin = `${local ? "http" : "https"}://${host}`

  void fetch(`${apiBase}/api/public/exams/${slug}`).then(async (response) => {
    if (!response.ok) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      res.end(indexHtml)
      return
    }
    const exam = await response.json()
    const html = injectSharePreview(indexHtml, sharePreviewFromExam({
      title: typeof exam.title === "string" ? exam.title : "Lembar ujian",
      subjectLabel: previewSubjectLabel(
        typeof exam.subject === "string" ? exam.subject : null,
        typeof exam.subjectLabel === "string" ? exam.subjectLabel : null
      ),
      grade: typeof exam.grade === "number" ? exam.grade : 0,
      origin,
      slug
    }))
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    res.end(html)
  }).catch(() => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    res.end(indexHtml)
  })
})

server.listen(8080, "127.0.0.1")
