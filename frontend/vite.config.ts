import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6501,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:6500',
        changeOrigin: true,
      },
    },
  },
})
