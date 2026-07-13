// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    setupFiles: './src/test/setup.jsx',
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './reports/frontend/junit.xml'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './reports/frontend/coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        'src/assets/**'
      ],
      thresholds: {
        statements: 90,
        lines: 90
      }
    }
  }
})
