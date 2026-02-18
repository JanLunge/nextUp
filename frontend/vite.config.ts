import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig } from 'vite';

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
        target: 'http://127.0.0.1:4457',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4457',
        changeOrigin: true,
      },
      // WebSocket proxy - matches all WebSocket upgrade requests
      '/ws': {
        target: 'http://127.0.0.1:4457',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
