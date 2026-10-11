import { db, user } from "@teacher-exam/db"
import { Effect, Effectable } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TestAuthServiceLayer } from "../../api/services/auth-service"
import { makeChain } from "./helpers"
import { buildHttpApiTestApp } from "./http-api-setup"

const USER_ID = "user-privacy"
const COOKIE = "better-auth.session_token=privacy"

const profileRow = {
  id: USER_ID,
  email: "guru@sekolah.test",
  name: "Sari Wulandari",
  username: "sari",
  image: null,
  school: null,
  gradesTaught: [5],
  subjectsTaught: ["bahasa_indonesia"],
  profileCompleted: true,
  locale: "id-ID",
  timezone: "Asia/Jakarta"
}

let signedIn = true

function userDeleteQuery(table: unknown) {
  class Query extends Effectable.Class<undefined, never, never> {
    commit() {
      if (table === user) signedIn = false
      return Effect.succeed(undefined)
    }
  }
  const query = new Query() as Query & {
    where: () => Query
    returning: () => Query
  }
  query.where = () => query
  query.returning = () => query
  return query
}

function buildApp() {
  return buildHttpApiTestApp({
    authLayer: TestAuthServiceLayer({
      getSession: (headers) => {
        const cookie = headers.get("cookie") ?? ""
        if (!signedIn || !cookie.includes(COOKIE)) return Effect.succeed(null)
        return Effect.succeed({
          user: { id: USER_ID, email: profileRow.email },
          session: { id: "sess-privacy", userId: USER_ID }
        })
      }
    })
  })
}

describe("POST /api/account", () => {
  beforeEach(() => {
    signedIn = true
    vi.mocked(db.select).mockReturnValue(makeChain([profileRow]))
    vi.mocked(db.delete).mockImplementation((table: unknown) => userDeleteQuery(table))
  })

  it("deletes the signed-in user so the next request is unauthorized", async () => {
    const app = buildApp()
    const deleted = await app.request("/api/account", {
      method: "POST",
      headers: {
        cookie: COOKIE,
        "content-type": "application/json"
      },
      body: JSON.stringify({ confirm: "HAPUS" })
    })

    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ deleted: true })

    const followUp = await app.request("/api/me", {
      headers: { cookie: COOKIE }
    })
    expect(followUp.status).toBe(401)
    expect(await followUp.json()).toMatchObject({ error: "Unauthorized" })
  })

  it("returns 400 for confirm SALAH and leaves the user in place", async () => {
    const app = buildApp()
    const rejected = await app.request("/api/account", {
      method: "POST",
      headers: {
        cookie: COOKIE,
        "content-type": "application/json"
      },
      body: JSON.stringify({ confirm: "SALAH" })
    })

    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toMatchObject({ _tag: "HttpApiDecodeError" })

    const stillThere = await app.request("/api/me", {
      headers: { cookie: COOKIE }
    })
    expect(stillThere.status).toBe(200)
    expect((await stillThere.json()) as { id: string }).toMatchObject({ id: USER_ID })
  })
})
