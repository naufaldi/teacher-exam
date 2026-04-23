import type { ReactElement, ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const {
  mockGetSession,
  mockSignOut,
  mockNavigate,
  mockSetUnauthorizedHandler,
  mockUser,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn<() => Promise<void>>(),
  mockNavigate: vi.fn<(opts: unknown) => Promise<void>>(),
  mockSetUnauthorizedHandler: vi.fn(),
  mockUser: {
    id: 'u1',
    name: 'Budi Santoso',
    email: 'budi@example.com',
    image: null as string | null,
    profileCompleted: true as boolean,
  },
}))

vi.mock('../../lib/auth-client', () => ({
  authClient: { getSession: mockGetSession },
  signOut: mockSignOut,
}))

vi.mock('../../lib/api', () => ({
  setUnauthorizedHandler: mockSetUnauthorizedHandler,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => ({
    options: config,
    useRouteContext: () => ({ user: mockUser }),
  }),
  redirect: (opts: Record<string, unknown>) => {
    const err = new Error('redirect') as Error & Record<string, unknown>
    err.isRedirect = true
    Object.assign(err, opts)
    throw err
  },
  Outlet: () => null,
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to?: unknown
    className?: string
    activeProps?: unknown
  }) => (
    <a href={typeof to === 'string' ? to : '#'} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}))

import { Route } from '../_auth'

type BeforeLoadFn = (args: { location: { pathname: string } }) => Promise<unknown>
type AuthComponent = () => ReactElement

const beforeLoad = (Route as unknown as { options: { beforeLoad: BeforeLoadFn } })
  .options.beforeLoad
const AuthLayout = (Route as unknown as { options: { component: AuthComponent } })
  .options.component

beforeEach(() => {
  vi.clearAllMocks()
  mockSignOut.mockResolvedValue(undefined)
  mockNavigate.mockResolvedValue(undefined)
  mockUser.profileCompleted = true
  mockUser.image = null
})

describe('_auth.beforeLoad', () => {
  it('redirects to / with session_expired when no session', async () => {
    mockGetSession.mockResolvedValue(null)
    let caught: (Error & Record<string, unknown>) | undefined
    try {
      await beforeLoad({ location: { pathname: '/dashboard' } })
    } catch (e) {
      caught = e as Error & Record<string, unknown>
    }
    expect(caught).toBeDefined()
    expect(caught?.['to']).toBe('/')
    expect(caught?.['search']).toEqual({ reason: 'session_expired' })
  })

  it('redirects to /onboarding when profile is incomplete', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { ...mockUser, profileCompleted: false } },
    })
    let caught: (Error & Record<string, unknown>) | undefined
    try {
      await beforeLoad({ location: { pathname: '/dashboard' } })
    } catch (e) {
      caught = e as Error & Record<string, unknown>
    }
    expect(caught).toBeDefined()
    expect(caught?.['to']).toBe('/onboarding')
  })

  it('does not redirect when already on /onboarding with incomplete profile', async () => {
    const user = { ...mockUser, profileCompleted: false }
    mockGetSession.mockResolvedValue({ data: { user } })
    const result = (await beforeLoad({ location: { pathname: '/onboarding' } })) as {
      user: typeof user
    }
    expect(result.user).toEqual(user)
  })

  it('returns user context when session is valid', async () => {
    mockGetSession.mockResolvedValue({ data: { user: mockUser } })
    const result = (await beforeLoad({ location: { pathname: '/dashboard' } })) as {
      user: typeof mockUser
    }
    expect(result.user).toEqual(mockUser)
  })
})

describe('AuthLayout', () => {
  it('renders the user name and computed initials', () => {
    render(<AuthLayout />)
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    expect(screen.getByText('BS')).toBeInTheDocument()
  })

  it('renders all primary navigation links', () => {
    render(<AuthLayout />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
    expect(screen.getByRole('link', { name: 'Riwayat' })).toHaveAttribute(
      'href',
      '/history',
    )
    expect(screen.getByRole('link', { name: 'Generate' })).toHaveAttribute(
      'href',
      '/generate',
    )
  })

  it('signs out and navigates home when "Keluar" is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthLayout />)

    const logoutBtn = screen.getByRole('button', { name: /keluar/i })
    await user.click(logoutBtn)

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' }),
    )
  })

  it('disables the logout button while sign-out is in flight', async () => {
    let resolveSignOut: () => void = () => {}
    mockSignOut.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveSignOut = resolve
      }),
    )

    const user = userEvent.setup()
    render(<AuthLayout />)
    const logoutBtn = screen.getByRole('button', { name: /keluar/i })

    await user.click(logoutBtn)

    expect(logoutBtn).toBeDisabled()

    resolveSignOut()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
    await waitFor(() => expect(logoutBtn).not.toBeDisabled())
  })

  it('throttles rapid double-clicks on logout', async () => {
    const user = userEvent.setup()
    render(<AuthLayout />)
    const logoutBtn = screen.getByRole('button', { name: /keluar/i })

    await user.click(logoutBtn)
    await user.click(logoutBtn)

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1))
  })

  it('clears the unauthorized handler on unmount', () => {
    const { unmount } = render(<AuthLayout />)
    expect(mockSetUnauthorizedHandler).toHaveBeenLastCalledWith(expect.any(Function))
    unmount()
    expect(mockSetUnauthorizedHandler).toHaveBeenLastCalledWith(null)
  })
})
