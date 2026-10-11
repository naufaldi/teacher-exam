import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const distIndex = path.join(webRoot, "dist/index.html")

const vite = await createServer({
  configFile: path.join(webRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  mode: "production"
})

try {
  globalThis.fetch = async () => {
    throw new Error("prerender has no network")
  }
  const mod = await vite.ssrLoadModule("/src/prerender.tsx")
  const html = await mod.prerenderLanding()
  const shell = readFileSync(distIndex, "utf8")
  const emptyRoot = "<div id=\"root\"></div>"
  if (!shell.includes(emptyRoot)) {
    throw new Error("dist/index.html has no empty root")
  }
  if (!html.includes("LULUS KURIKULUM")) {
    throw new Error("prerender did not include the sample badge")
  }
  writeFileSync(distIndex, shell.replace(emptyRoot, `<div id="root">${html}</div>`))
} finally {
  await vite.close()
}
