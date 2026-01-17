import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5267,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4457',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4457',
        changeOrigin: true,
      },
      // WebSocket proxy - matches all WebSocket upgrade requests
      '/ws': {
        target: 'ws://localhost:4457',
        ws: true,
      },
    },
  },
})
