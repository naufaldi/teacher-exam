import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { collectAndDownloadSibiBooks, formatDownloadInventory } from "./lib/curriculum-download-books.js"
import { DEFAULT_CURRICULUM_PDF_DIR } from "./lib/curriculum-report.js"

interface CliOptions {
  dryRun: boolean
  force: boolean
  inventoryPath: string
}

function parseArgs(args: ReadonlyArray<string>): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    force: false,
    inventoryPath: join(DEFAULT_CURRICULUM_PDF_DIR, "sibi-download-inventory.tsv")
  }

  for (const arg of args) {
    if (arg === "--") continue
    if (arg === "--dry-run") {
      options.dryRun = true
      continue
    }
    if (arg === "--force") {
      options.force = true
      continue
    }
    if (arg.startsWith("--inventory=")) {
      options.inventoryPath = arg.slice("--inventory=".length)
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const options = parseArgs(process.argv.slice(2))
const rows = await collectAndDownloadSibiBooks({
  dryRun: options.dryRun,
  force: options.force
})
const report = formatDownloadInventory(rows)

await writeFile(options.inventoryPath, `${report}\n`)
console.log(report)
console.log(`\nInventory written to ${options.inventoryPath}`)
