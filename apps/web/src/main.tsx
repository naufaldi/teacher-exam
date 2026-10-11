import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { shouldHydratePrerenderedRoot } from "./lib/landing-bootstrap"
import { routeTree } from "./routeTree.gen"
import "./app.css"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Root element not found")
const root = rootEl

function renderApp(mode: "hydrate" | "create"): void {
  const tree = (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
  if (mode === "hydrate") {
    hydrateRoot(root, tree)
    return
  }
  createRoot(root).render(tree)
}

const rootText = rootEl.textContent ?? ""
if (shouldHydratePrerenderedRoot(window.location.pathname, window.location.search, rootText)) {
  void router.load().then(() => {
    if (shouldHydratePrerenderedRoot(window.location.pathname, window.location.search, rootText)) {
      router.ssr = { manifest: undefined }
      renderApp("hydrate")
      return
    }
    root.replaceChildren()
    renderApp("create")
  }, () => {
    root.replaceChildren()
    renderApp("create")
  })
} else {
  if (rootText !== "") root.replaceChildren()
  renderApp("create")
}

const sentryDsn = import.meta.env["VITE_SENTRY_DSN"]
if (typeof sentryDsn === "string" && sentryDsn.length > 0) {
  const startSentry = () => {
    void import("./lib/sentry-client").then((mod) => {
      void mod.initWebSentry()
    })
  }
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => {
      startSentry()
    })
  } else {
    window.setTimeout(startSentry, 1)
  }
}
