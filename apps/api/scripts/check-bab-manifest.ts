import { readBabManifestDrift } from "../src/curriculum/bab-index.js"

const drift = readBabManifestDrift()
if (drift.length > 0) {
  for (const item of drift) {
    console.error(`${item.file} bab ${item.bab} ${item.reason}`)
  }
  console.error(`bab manifest drift: ${drift.length}`)
  process.exit(1)
}

console.log("bab manifest matches corpus files")
