import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

/** En dev (`npm run dev:pwa`) no existe `/api/*` en Vercel: ejecutamos el mismo handler que en producción. */
function pwaAdminOnboardingDevApi() {
  let handler
  return {
    name: 'pwa-admin-onboarding-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url || '').split('?')[0] || ''
        if (pathOnly !== '/api/admin-onboarding') return next()

        const env = loadEnv(server.config.mode, server.config.envDir || __dirname, '')
        const set = (k, v) => {
          const s = v != null ? String(v).trim() : ''
          if (s) process.env[k] = s
        }
        set('SUPABASE_URL', env.SUPABASE_URL || env.VITE_SUPABASE_URL)
        set('SUPABASE_ANON_KEY', env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)
        set('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY)
        set('PUBLIC_DEMO_URL', env.PUBLIC_DEMO_URL || env.VITE_PUBLIC_DEMO_URL)
        set('RESEND_API_KEY', env.RESEND_API_KEY)
        set('MAIL_FROM_EMAIL', env.MAIL_FROM_EMAIL)
        set('MAIL_FROM_NAME', env.MAIL_FROM_NAME)
        set('MAIL_LOGO_URL', env.MAIL_LOGO_URL)

        try {
          if (!handler) handler = require(path.join(__dirname, 'api', 'admin-onboarding.js'))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: e?.message || 'No se pudo cargar api/admin-onboarding.js' }))
          return
        }

        try {
          await handler(req, res)
        } catch (e) {
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: e?.message || String(e) }))
          }
        }
      })
    }
  }
}

/** Con root en src/renderer, Vite por defecto abre index.html (Electron). Forzamos la entrada PWA. */
function pwaDefaultHtmlPlugin() {
  return {
    name: 'pwa-default-html',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url || ''
        const path = raw.split('?')[0] || ''
        if (path === '/' || path === '/index.html') {
          const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
          req.url = '/index-pwa.html' + qs
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url || ''
        const path = raw.split('?')[0] || ''
        if (path === '/' || path === '/index.html') {
          const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
          req.url = '/index-pwa.html' + qs
        }
        next()
      })
    }
  }
}

export default defineConfig({
  envDir: resolve(__dirname),
  plugins: [
    pwaDefaultHtmlPlugin(),
    pwaAdminOnboardingDevApi(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB limit
        // SPA con index-pwa.html: sin esto Workbox avisa que la navegación no coincide con el allowlist
        navigateFallback: '/index-pwa.html',
        navigateFallbackAllowlist: [/^\/$/, /^\/index-pwa\.html(\?.*)?$/],
        navigateFallbackDenylist: [/^\/@/, /^\/__/, /^\/src\//, /^\/node_modules\//],
        runtimeCaching: [
          {
            // Licencia / sync: siempre red (evita que un SW antiguo o reglas raras devuelvan HTML/cache y falle el JSON).
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\//i,
            handler: 'NetworkOnly',
            options: { cacheName: 'supabase-rest-bypass' }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Gestión Comercio',
        short_name: 'GestionComercio',
        description: 'Sistema de gestión comercial completo',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icons/pwa-512x512.svg', 
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'icons/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index-pwa.html'
      }
    })
  ],
  
  // Configuración para PWA
  root: './src/renderer',
  base: './',
  
  build: {
    outDir: '../../dist-pwa',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index-pwa.html')
    }
  },
  
  server: {
    port: 3000,
    open: '/index-pwa.html'
  },
  
  // Alias para imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@adapters': resolve(__dirname, 'src/adapters')
    }
  },
  
  // Variables de entorno
  define: {
    __IS_PWA__: true,
    __IS_ELECTRON__: false
  },
  
  preview: {
    port: 3000,
    open: true
  }
})