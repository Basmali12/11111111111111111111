import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'favicon.png', 'app-logo.jpg'],
        manifest: {
          id: './',
          name: 'اللواء - 22 - بنك المعلومات',
          short_name: 'اللواء - 22 - بنك المعلومات',
          description: 'تطبيق سطح مكتب متطور أوفلاين لحفظ وإدارة سجلات المنتسبين مباشرة في قرص C بدون تعقيد',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'any',
          dir: 'rtl',
          lang: 'ar',
          start_url: './',
          icons: [
            {
              src: './pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,json,woff,woff2,ttf,pfb,bcmap,wasm,txt}'],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          globIgnores: ['**/header-military-banner.png', '**/iraq-eagle-transparent.png', '**/sidebar-portrait-transparent.png', '**/sidebar-soldiers.png', '**/soldiers-no-smoke.png'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
