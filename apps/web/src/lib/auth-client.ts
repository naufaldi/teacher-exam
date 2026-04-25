import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  // Prod: VITE_API_URL=https://api.ujiansd.com/api → baseURL=https://api.ujiansd.com/api/auth
  // Dev: unset → same-origin /api/auth, proxied by Vite to :3001
  baseURL: import.meta.env['VITE_API_URL']
    ? `${import.meta.env['VITE_API_URL']}/auth`
    : `${typeof window === 'undefined' ? '' : window.location.origin}/api/auth`,
  plugins: [
    inferAdditionalFields({
      user: {
        username:         { type: 'string',   required: true },
        school:           { type: 'string',   required: false },
        gradesTaught:     { type: 'number[]', required: false },
        subjectsTaught:   { type: 'string[]', required: false },
        profileCompleted: { type: 'boolean',  required: false },
        locale:           { type: 'string',   required: false },
        timezone:         { type: 'string',   required: false },
        lastLoginAt:      { type: 'date',     required: false },
      },
    }),
  ],
})

export const { signIn, signOut, useSession, getSession } = authClient
