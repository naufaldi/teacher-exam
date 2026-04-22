import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@teacher-exam/ui'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" />
    </>
  )
}
