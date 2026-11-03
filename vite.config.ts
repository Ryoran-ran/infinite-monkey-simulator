import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Keep assets and the module Worker valid under a GitHub Pages project path.
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
