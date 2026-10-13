import { createFileRoute } from "@tanstack/react-router"
import { PrivacyNoticePage } from "../components/privacy/privacy-notice.js"

export const Route = createFileRoute("/kebijakan-privasi")({
  component: PrivacyNoticePage
})
