import { user } from "@teacher-exam/db"
import { eq } from "drizzle-orm"
import { Effect } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import { DbClient } from "../api/services/db"

const USERNAME_RE = /[^a-z0-9._-]/g

export function deriveUniqueUsername(email: string): Effect.Effect<string, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const local = (email.split("@")[0] ?? "user").toLowerCase().replace(USERNAME_RE, "")
    const base = local.length >= 3 ? local.slice(0, 32) : `user${local}`.slice(0, 32)

    let candidate = base
    let suffix = 2
    while (yield* usernameExists(candidate)) {
      const tail = `-${suffix}`
      candidate = `${base.slice(0, 32 - tail.length)}${tail}`
      suffix += 1
      if (suffix > 9999) {
        return yield* Effect.die(new Error("Could not derive unique username"))
      }
    }
    return candidate
  })
}

function usernameExists(candidate: string): Effect.Effect<boolean, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const rows = yield* runDb(
      db.select({ id: user.id }).from(user).where(eq(user.username, candidate)).limit(1)
    )
    return rows.length > 0
  })
}
