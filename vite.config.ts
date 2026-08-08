import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Stamped into the bundle at build time and shown next to the app name, so a
// glance at the header answers "is this actually the build I just pushed?".
// Pinned to America/New_York on purpose: the CI runner builds in UTC, and a
// version that disagreed with the wall clock would be worse than none.
const BUILD_ID = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
  .format(new Date())
  .replace(/\D/g, '')

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        // the FCM worker registers itself on its own scope (see src/push.ts) —
        // Workbox must not precache or serve it
        globIgnores: ['**/firebase-messaging-sw.js'],
        // the plugin default, plus m4a: the duel's One Piece shouts (~110 KB for
        // the set) are part of the game feeling like a game, so they ship offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,m4a}'],
        runtimeCaching: [
          {
            // Gym exercise demos (BUSINESS_REQUIREMENTS §18l). They are content-
            // addressed by exercise id and only ever replaced by re-running the
            // script, so CacheFirst is exactly right: the FIRST time you see an
            // exercise costs ~21 KB, and every time after that costs nothing —
            // including with no signal at all. Covers both places the script can
            // put them: Firebase Storage, or /gym/ in the app's own bundle.
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/gym/') || /(^|\.)firebasestorage\.(googleapis\.com|app)$/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'gym-demos',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 },
              // Storage download URLs are cross-origin; an opaque (status 0)
              // response still caches and still renders in an <img>.
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
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
