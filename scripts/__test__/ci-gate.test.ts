import { readdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..")

type Job = {
  needs?: string | Array<string>
  uses?: string
}

type Workflow = {
  on?: {
    pull_request?: { branches?: Array<string> }
    push?: { branches?: Array<string> }
    workflow_call?: unknown
  }
  concurrency?: {
    group?: string
    "cancel-in-progress"?: boolean
  }
  permissions?: {
    contents?: string
    packages?: string
  }
  jobs?: Record<string, Job>
}

function loadWorkflow(name: string): Workflow {
  const store = join(repoRoot, "node_modules/.pnpm")
  const entry = readdirSync(store).find((item) => item.startsWith("js-yaml@"))
  if (entry === undefined) {
    throw new Error("js-yaml missing from node_modules/.pnpm")
  }
  const require = createRequire(join(store, entry, "node_modules/js-yaml/package.json"))
  const yaml = require("js-yaml") as {
    CORE_SCHEMA: unknown
    load: (text: string, options: { schema: unknown }) => unknown
  }
  const parsed = yaml.load(readFileSync(join(repoRoot, ".github/workflows", name), "utf8"), {
    schema: yaml.CORE_SCHEMA
  })
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`${name} did not parse to an object`)
  }
  return parsed as Workflow
}

function needsOf(job: Job | undefined): Array<string> {
  if (job === undefined || job.needs === undefined) {
    return []
  }
  return Array.isArray(job.needs) ? job.needs : [job.needs]
}

describe("ci gate", () => {
  it("runs quality on a push to main", () => {
    const ci = loadWorkflow("ci.yml")

    expect(ci.jobs?.quality).toBeDefined()
    expect(ci.on?.push?.branches).toEqual(["main"])
  })

  it("keeps quality on a pull request to main", () => {
    const ci = loadWorkflow("ci.yml")

    expect(ci.on?.pull_request?.branches).toEqual(["main"])
  })

  it("lets deploy call the CI workflow", () => {
    const ci = loadWorkflow("ci.yml")

    expect(ci.on).toHaveProperty("workflow_call")
  })

  it("keeps a push run from cancelling the called CI run", () => {
    const ci = loadWorkflow("ci.yml")

    expect(ci.concurrency?.["cancel-in-progress"]).toBe(true)
    expect(ci.concurrency?.group).toBe(
      "ci-${{ github.event_name }}-${{ github.head_ref || github.run_id }}"
    )
  })

  it("makes deploy wait for a quality job that runs CI", () => {
    const deploy = loadWorkflow("deploy.yml")

    expect(needsOf(deploy.jobs?.deploy)).toEqual([
      "build-and-push-api",
      "build-and-push-web",
      "commit-hash",
      "quality"
    ])
    expect(deploy.jobs?.quality?.uses).toBe("./.github/workflows/ci.yml")
    expect(deploy.permissions).toEqual({
      contents: "read",
      packages: "write"
    })
  })

  it("does not publish images until quality passes", () => {
    const deploy = loadWorkflow("deploy.yml")

    expect(needsOf(deploy.jobs?.["build-and-push-api"])).toEqual(["commit-hash", "quality"])
    expect(needsOf(deploy.jobs?.["build-and-push-web"])).toEqual(["commit-hash", "quality"])
  })
})
