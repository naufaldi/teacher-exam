import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export default defineConfig(({ mode }) => {
  const fromFiles = loadEnv(mode, monorepoRoot, '')
  const apiPort = process.env['API_PORT'] ?? fromFiles['API_PORT'] ?? '3001'

  return {
    plugins: [
      TanStackRouterVite({ routesDirectory: './src/routes' }),
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
