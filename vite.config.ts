import { defineConfig, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { readFileSync } from 'node:fs';

const analyze = process.env.ANALYZE === '1';
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as {
  version: string;
};

// Déployé sur GitHub Pages : https://mister-guiiug.github.io/miss-genius/
export default defineConfig(({ command }) => {
  const basePath = command === 'build' ? '/miss-genius/' : '/';

  return {
    base: basePath,
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            const norm = id.replace(/\\/g, '/');
            if (norm.includes('/@rive-app/')) return 'rive';
            if (
              norm.includes('/react-dom/') ||
              norm.includes('/node_modules/react/') ||
              norm.includes('/scheduler/')
            ) {
              return 'react-vendor';
            }
            if (norm.includes('/react-router')) return 'router';
            if (norm.includes('/zustand/')) return 'zustand';
            return 'vendor';
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/apple-touch-icon.png',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2,webmanifest}'],
          // Le moteur Rive (optionnel, décoratif, chargé à la demande) reste hors
          // du précache : on garde un shell hors ligne léger sur réseau lent.
          globIgnores: ['**/rive-*.js', '**/RivePlayer-*.js'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
        manifest: {
          id: '/miss-genius/',
          name: 'Miss Genius',
          short_name: 'Miss Genius',
          description:
            'Simule tes moyennes scolaires : matières, notes, scénarios et objectifs. 100% hors ligne.',
          theme_color: '#6d28d9',
          background_color: '#f7f5ff',
          display: 'standalone',
          orientation: 'portrait',
          scope: basePath,
          start_url: basePath,
          lang: 'fr',
          dir: 'ltr',
          categories: ['education', 'productivity'],
          shortcuts: [
            {
              name: 'Tableau de bord',
              short_name: 'Accueil',
              url: `${basePath}#/`,
            },
            {
              name: 'Matières',
              short_name: 'Matières',
              url: `${basePath}#/subjects`,
            },
            {
              name: 'Scénarios',
              short_name: 'Scénarios',
              url: `${basePath}#/scenarios`,
            },
            {
              name: 'Objectif',
              short_name: 'Objectif',
              url: `${basePath}#/goal`,
            },
          ],
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
      ...(analyze
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
              open: !process.env.CI,
            }) as PluginOption,
          ]
        : []),
    ],
  };
});
