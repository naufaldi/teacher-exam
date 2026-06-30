import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/__test__/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Match .github/workflows/ci.yml — delivery/analytics/correction tests expect enabled UI
    env: {
      VITE_DELIVERY_ENABLED: "true"
    }
  }
})
