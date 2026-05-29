import type { Config } from "drizzle-kit"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const configDir = dirname(fileURLToPath(import.meta.url))

function loadRootEnvFile(): void {
  const envPath = resolve(configDir, "../../.env")
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (trimmed === "" || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    if (process.env[key] !== undefined) continue
    let value = trimmed.slice(eq + 1)
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

if (!process.env["DATABASE_URL"]) {
  loadRootEnvFile()
}

const DATABASE_URL = process.env["DATABASE_URL"]
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set")

export default {
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url: DATABASE_URL }
} satisfies Config
