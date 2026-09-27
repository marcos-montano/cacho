import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'cubilete.jpg'],
      manifest: {
        name: 'Cacho Alalay',
        short_name: 'Cacho',
        description: 'Juego Boliviano de Dados',
        theme_color: '#0d2818',
        background_color: '#0a1a10',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
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
    reporters: 'verbose',
    // Coverage (optional, run with: npx vitest run --coverage)
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
});
