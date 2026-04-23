import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: `${typeof window === 'undefined' ? '' : window.location.origin}/api/auth`,
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
