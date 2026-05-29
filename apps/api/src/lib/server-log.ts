const SERVICE = "teacher-exam-api"

function useJsonLines(): boolean {
  return process.env["NODE_ENV"] === "production"
}

function emit(
  level: "info" | "warn" | "error",
  msg: string,
  extra?: Record<string, unknown>
): void {
  const time = new Date().toISOString()
  const hasExtra = extra !== undefined && Object.keys(extra).length > 0

  if (useJsonLines()) {
    const payload: Record<string, unknown> = {
      service: SERVICE,
      level,
      msg,
      time
    }
    if (hasExtra) {
      payload["extra"] = extra
    }
    const line = JSON.stringify(payload)
    if (level === "error") {
      console.error(line)
    } else if (level === "warn") {
      console.warn(line)
    } else {
      console.log(line)
    }
    return
  }

  let out = `[${SERVICE}] ${level.toUpperCase()} ${time} ${msg}`
  if (hasExtra) {
    out += ` ${JSON.stringify(extra)}`
  }
  if (level === "error") {
    console.error(out)
  } else if (level === "warn") {
    console.warn(out)
  } else {
    console.log(out)
  }
}

/** Structured API process logging: JSON lines in production, readable lines in dev. */
export function logInfo(msg: string, extra?: Record<string, unknown>): void {
  emit("info", msg, extra)
}

export function logWarn(msg: string, extra?: Record<string, unknown>): void {
  emit("warn", msg, extra)
}

export function logError(msg: string, extra?: Record<string, unknown>): void {
  emit("error", msg, extra)
}
