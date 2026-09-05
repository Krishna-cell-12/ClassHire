import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Express API's default port (server/.env PORT). Override with VITE_PROXY_TARGET.
//
// 127.0.0.1 rather than "localhost" on purpose: on Windows, Node resolves
// localhost to ::1 first, and the API binds IPv4, so a localhost target makes
// every proxied request fail with ECONNREFUSED.
const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:4000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Lets the frontend call /api/* without CORS during dev.
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
