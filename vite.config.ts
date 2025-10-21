import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'globalThis',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'appstore.png', 'vite.svg'],
      manifest: {
        name: 'CO‑SAFE Connect — Vehicle CO Monitor',
        short_name: 'CO‑SAFE',
        description: 'Safety‑critical mobile web app for real‑time vehicle CO monitoring (PWA).',
        theme_color: '#1976D2',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: '/appstore.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/appstore.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View CO levels dashboard',
            url: '/',
            icons: [{ src: '/appstore.png', sizes: '192x192' }]
          },
          {
            name: 'Alerts',
            short_name: 'Alerts',
            description: 'View safety alerts',
            url: '/#alerts',
            icons: [{ src: '/appstore.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // Safety-critical: don't auto-update
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-native': 'react-native-web',
      'react-native-svg': 'react-native-svg-web',
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(
        __dirname,
        './src/polyfills/codegenNativeComponent.ts'
      ),
    },
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    include: ['react-native-web', 'react-native-svg-web', '@gluestack-ui/themed', '@gluestack-style/react'],
    esbuildOptions: {
      resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-alert-dialog', '@radix-ui/react-avatar', '@radix-ui/react-dialog'],
          charts: ['recharts', 'react-gauge-component'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
          icons: ['lucide-react', '@iconify/react'],
          animation: ['framer-motion']
        }
      }
    },
    sourcemap: false,
    cssCodeSplit: true
  }
})
