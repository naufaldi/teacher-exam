import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/__test__/**/*.test.ts", "scripts/__test__/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/api/handlers/bank*.ts", "src/api/services/bank-service.ts"],
      reporter: ["text", "text-summary"]
    }
  }
})
