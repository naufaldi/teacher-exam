import { inferAdditionalFields } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export function authClientBaseUrl(origin: string | undefined, apiUrl: string | undefined): string {
  const host = origin ?? "http://127.0.0.1"
  if (!apiUrl) return `${host}/api/auth`
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(apiUrl)) return `${apiUrl}/auth`
  const path = apiUrl.startsWith("/") ? apiUrl : `/${apiUrl}`
  return `${host}${path}/auth`
}

export const authClient = createAuthClient({
  // Prod: VITE_API_URL=https://api.example.com/api → baseURL=https://api.example.com/api/auth
  // CI and dev may set VITE_API_URL=/api. Prerender has no window, so that path is joined to an absolute host.
  baseURL: authClientBaseUrl(
    typeof window === "undefined" ? undefined : window.location.origin,
    import.meta.env["VITE_API_URL"]
  ),
  plugins: [
    inferAdditionalFields({
      user: {
        username: { type: "string", required: true },
        school: { type: "string", required: false },
        gradesTaught: { type: "number[]", required: false },
        subjectsTaught: { type: "string[]", required: false },
        profileCompleted: { type: "boolean", required: false },
        locale: { type: "string", required: false },
        timezone: { type: "string", required: false },
        lastLoginAt: { type: "date", required: false }
      }
    })
  ]
})

export const { getSession, signIn, signOut, useSession } = authClient
