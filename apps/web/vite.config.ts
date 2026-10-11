import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { injectSharePreview, previewSubjectLabel, sharePreviewFromExam } from "./src/lib/share-preview.ts"

const webRoot = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(webRoot, "../..")

function sharePreviewPlugin(apiPort: string): Plugin {
  return {
    name: "share-preview",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = req.url?.split("?")[0] ?? ""
        const match = pathOnly.match(/^\/share\/([A-Za-z0-9_-]+)\/?$/)
        if (req.method !== "GET" || !match) {
          next()
          return
        }
        const slug = match[1] ?? ""
        const indexHtml = readFileSync(path.join(webRoot, "index.html"), "utf8")
        void fetch(`http://127.0.0.1:${apiPort}/api/public/exams/${slug}`).then(async (response) => {
          if (!response.ok) {
            res.statusCode = 200
            res.setHeader("content-type", "text/html; charset=utf-8")
            res.end(indexHtml)
            return
          }
          const exam = await response.json() as {
            title?: string
            subject?: string | null
            subjectLabel?: string | null
            grade?: number
          }
          const host = req.headers.host ?? `localhost:${apiPort}`
          const html = injectSharePreview(
            indexHtml,
            sharePreviewFromExam({
              title: exam.title ?? "Lembar ujian",
              subjectLabel: previewSubjectLabel(exam.subject ?? null, exam.subjectLabel ?? null),
              grade: exam.grade ?? 0,
              origin: `http://${host}`,
              slug
            })
          )
          res.statusCode = 200
          res.setHeader("content-type", "text/html; charset=utf-8")
          res.end(html)
        }).catch(() => {
          next()
        })
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const fromFiles = loadEnv(mode, monorepoRoot, "")
  const apiPort = process.env["API_PORT"] ?? fromFiles["API_PORT"] ?? "3000"

  return {
    plugins: [
      sharePreviewPlugin(apiPort),
      TanStackRouterVite({
        routesDirectory: "./src/routes",
        routeFileIgnorePattern: "__test__"
      }),
      react(),
      tailwindcss()
    ],
    server: {
      port: Number(process.env["WEB_PORT"] ?? fromFiles["WEB_PORT"] ?? 5173),
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true
        }
      }
    }
  }
})
