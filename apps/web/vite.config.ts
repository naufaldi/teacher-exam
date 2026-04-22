import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: './src/routes' }),
    react(),
    tailwindcss(),
  ],
  server: {
    port: Number(process.env['WEB_PORT'] ?? 3000),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env['API_PORT'] ?? 3001}`,
        changeOrigin: true,
      },
    },
  },
})
