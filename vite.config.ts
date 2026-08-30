import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // Never let the SPA fallback or precache intercept the PHP API.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Scrabble Score Tracker',
        short_name: 'Scrabble',
        description: 'Track your Scrabble games with style',
        theme_color: '#d97706',
        background_color: '#2a2520',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            // Android crops maskable icons, so this one keeps the tile inside
            // the safe zone. The full-bleed icons above would lose their edges.
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
