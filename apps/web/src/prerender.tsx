import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { routeTree } from "./routeTree.gen"

export async function prerenderLanding(): Promise<string> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] })
  })
  await router.load()
  return renderToString(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
