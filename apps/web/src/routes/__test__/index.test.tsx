import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockGetSession, mockSignInSocial, mockSearch } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignInSocial: vi.fn(),
  mockSearch: { reason: undefined as 'session_expired' | undefined },
}))

vi.mock('../../lib/auth-client', () => ({
  getSession: mockGetSession,
  signIn: { social: mockSignInSocial },
}))

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => ({
    options: config,
    useSearch: () => mockSearch,
  }),
  useNavigate: () => mockNavigate,
  redirect: (opts: Record<string, unknown>) => {
    const err = new Error('redirect') as Error & Record<string, unknown>
    err.isRedirect = true
    Object.assign(err, opts)
    throw err
  },
  isRedirect: (value: unknown) =>
    Boolean(value && typeof value === 'object' && (value as { isRedirect?: unknown }).isRedirect),
}))

import { Route } from '../index'

type BeforeLoadFn = () => Promise<unknown>
type LoginComponent = () => ReactElement

const beforeLoad = (Route as unknown as { options: { beforeLoad: BeforeLoadFn } })
  .options.beforeLoad
const LoginPage = (Route as unknown as { options: { component: LoginComponent } })
  .options.component

beforeEach(() => {
  vi.clearAllMocks()
  mockSearch.reason = undefined
})

describe('index.beforeLoad', () => {
  it('redirects authenticated users to the dashboard', async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: 'u1' } } })

    let caught: (Error & Record<string, unknown>) | undefined
    try {
      await beforeLoad()
    } catch (e) {
      caught = e as Error & Record<string, unknown>
    }

    expect(caught).toBeDefined()
    expect(caught?.['to']).toBe('/dashboard')
  })

  it('renders the login page when session lookup fails without a redirect', async () => {
    mockGetSession.mockRejectedValue(new Error('Failed to fetch'))

    await expect(beforeLoad()).resolves.toBeUndefined()
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: 'Masuk dengan akun Google' })).toBeInTheDocument()
  })
})

describe('LoginPage', () => {
  it('starts Google sign-in with an absolute dashboard callback URL', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Masuk dengan akun Google' }))

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    })
  })
})
