import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // the FCM worker registers itself on its own scope (see src/push.ts) —
      // Workbox must not precache or serve it
      workbox: { globIgnores: ['**/firebase-messaging-sw.js'] },
      manifest: {
        name: 'Wheels of Procrastination',
        short_name: 'WheelsOP',
        description: 'Spin the wheel. Do the thing. Set sail with Luffy.',
        theme_color: '#0c2338',
        background_color: '#0c2338',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
