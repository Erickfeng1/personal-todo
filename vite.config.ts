import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'

const localApiGuard: Plugin = {
  name: 'local-api-guard',
  apply: 'serve' as const,
  configureServer(server) {
    server.middlewares.use('/api', (_request, response) => {
      response.statusCode = 503
      response.setHeader('content-type', 'application/json; charset=utf-8')
      response.setHeader('cache-control', 'no-store')
      response.end(JSON.stringify({ error: { code: 'LOCAL_API_UNAVAILABLE' } }))
    })
  }
}

export default defineConfig({
  envPrefix: ['VITE_'],
  plugins: [
    localApiGuard,
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: '序 Todo',
        short_name: '序 Todo',
        description: '一个安静、由私人云端保存的个人待办工具',
        theme_color: '#f4f0e8',
        background_color: '#f4f0e8',
        display: 'standalone',
        start_url: '/today',
        icons: [
          {
            src: '/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true
  }
})
