import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Development server settings
  server: {
    port: 5173,
    open: true,
  },

  // Production build settings
  build: {
    outDir: 'dist',
    sourcemap: true,
  },

  // Vitest configuration
  test: {
    // Run tests in a Node environment (no browser needed for the pure core engine)
    environment: 'node',
    // Test file discovery
    include: ['tests/**/*.test.ts'],
    // Show detailed output
    reporter: 'verbose',
    // Coverage (optional, run with: npx vitest run --coverage)
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
});
