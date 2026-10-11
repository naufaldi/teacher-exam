import { describe, expect, test } from "vitest"
import { user } from "../users.js"

describe("user school kop columns", () => {
  test("school address and logo are nullable text columns", () => {
    expect(user.schoolAddress.name).toBe("school_address")
    expect(user.schoolLogo.name).toBe("school_logo")
    expect((user.schoolAddress as { notNull: boolean }).notNull).toBe(false)
    expect((user.schoolLogo as { notNull: boolean }).notNull).toBe(false)
  })
})
