import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
