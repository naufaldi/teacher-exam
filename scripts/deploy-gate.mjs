export const shellMark = "id=\"root\""

export function productionCaddyImage(dockerfile) {
  const line = dockerfile.split("\n").find((row) => row.startsWith("FROM ") && row.trimEnd().endsWith("AS runtime"))
  if (line === undefined) return ""
  return line.trim().split(/\s+/)[1] ?? ""
}

export function assessProbe(probe) {
  if (!Number.isInteger(probe.redirects) || probe.redirects < 0) {
    return { ok: false, reason: "redirect count missing" }
  }
  if (probe.redirects > 1) {
    return { ok: false, reason: "redirect loop" }
  }
  if (probe.status !== 200) {
    return { ok: false, reason: `status ${probe.status}` }
  }
  if (probe.expectShell && !String(probe.body).includes(shellMark)) {
    return { ok: false, reason: "missing app shell" }
  }
  return { ok: true, reason: "ok" }
}

export function probeTable(env) {
  const web = env.webOrigin.replace(/\/$/, "")
  return [
    { name: "home", url: `${web}/`, expectShell: true },
    { name: "share", url: `${web}/share/smoke`, expectShell: true },
    { name: "asset", url: `${web}/favicon.svg`, expectShell: false },
    { name: "api", url: env.apiHealthUrl, expectShell: false }
  ]
}

export function planRollback(input) {
  if (input.smokeOk) return { action: "keep", tag: input.nextTag }
  if (input.previousTag === "") return { action: "abort", reason: "no previous image tag" }
  return { action: "restore", tag: input.previousTag }
}

export function rollbackCommand(tag) {
  return `IMAGE_TAG=${tag} docker compose -f docker-compose.prod.yml --env-file .env.production up -d`
}
