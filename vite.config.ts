import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TrackMyFuel',
        short_name: 'TrackMyFuel',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#16a34a',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.origin,
            handler: 'NetworkFirst',
            options: { cacheName: 'app-shell', expiration: { maxEntries: 50 } }
          },
          {
            urlPattern: ({ url }) => /googleapis\.com|gstatic\.com/.test(url.hostname),
            handler: 'NetworkFirst',
            options: { cacheName: 'google-apis' }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
