import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { injectSharePreview, previewSubjectLabel, sharePreviewFromExam } from "./src/lib/share-preview.ts"

const webRoot = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(webRoot, "../..")

function sharePreviewPlugin(apiPort: string): Plugin {
  return {
    name: "share-preview",
    transformIndexHtml: {
      order: "pre",
      async handler(html, ctx) {
        const pathOnly = (ctx.originalUrl ?? "").split("?")[0] ?? ""
        const match = pathOnly.match(/^\/share\/([A-Za-z0-9_-]+)\/?$/)
        if (!match) return html
        const slug = match[1] ?? ""
        try {
          const response = await fetch(`http://127.0.0.1:${apiPort}/api/public/exams/${slug}`)
          if (!response.ok) return html
          const exam = await response.json() as {
            title?: string
            subject?: string | null
            subjectLabel?: string | null
            grade?: number
          }
          const port = ctx.server?.config.server.port ?? 5173
          return injectSharePreview(html, sharePreviewFromExam({
            title: exam.title ?? "Lembar ujian",
            subjectLabel: previewSubjectLabel(exam.subject ?? null, exam.subjectLabel ?? null),
            grade: exam.grade ?? 0,
            origin: `http://localhost:${port}`,
            slug
          }))
        } catch {
          return html
        }
      }
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
