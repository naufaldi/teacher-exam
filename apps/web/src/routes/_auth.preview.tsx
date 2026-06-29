import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/preview")({
  component: RouteComponent
})

function RouteComponent() {
  return <div>Hello "/_auth/preview"!</div>
}
