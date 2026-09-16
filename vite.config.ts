import { defineConfig, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';
import { visualizer } from 'rollup-plugin-visualizer';
import { readFileSync } from 'node:fs';
import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';

const analyze = process.env.ANALYZE === '1';
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as {
  version: string;
};

// Déployé sur GitHub Pages : https://mister-guiiug.github.io/miss-genius/
export default defineConfig(({ command }) => {
  // `VITE_BASE_PATH` (déploiement famille + CI Lighthouse avec « / ») prioritaire.
  const basePath =
    process.env.VITE_BASE_PATH || (command === 'build' ? '/miss-genius/' : '/');

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
            // Sentry est chargé par un `import()` que `loader` rend
            // analysable. Sans cette ligne il tomberait dans `vendor`,
            // qui est PRÉCHARGÉ : mesuré sur miss-uwh, 381,9 kB
            // préchargés au lieu de 227,2 — pour un total gzip identique
            // à 0,1 kB près. Le total ne voit pas la différence,
            // `bundleBudget.preloadGzipKb` si.
            if (norm.includes('/@sentry/')) return 'sentry';
            if (norm.includes('/@rive-app/')) return 'rive';
            // Le générateur PDF du socle est importé DYNAMIQUEMENT au clic
            // sur « PDF » ; sans cette ligne il retombait dans `vendor`, que
            // l'entrée précharge — l'import différé n'aurait rien différé.
            if (norm.includes('/dev-pwa-config/pdf')) return 'pdf';
            if (norm.includes('/lucide-react/')) return 'icons';
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
      // AVANT cspPlugin : il pose un script inline dans le <head>, que la
      // CSP doit hacher après coup ; et il écrit version.json au build.
      versionPlugin({ manifest: true, define: false }),
      react(),
      tailwindcss(),
      // SEO partagé famille : canonical/OG via placeholders index.html +
      // sitemap.xml/robots.txt générés au build.
      pwaSeoPlugin({
        // Deux <meta name="theme-color"> par schéma : la barre du navigateur suit
        // le mode sombre dès le premier rendu (relevé du 02/09/2026 : 5 apps sur 16).
        themeColor: { light: '#f7f5ff', dark: '#16131f' },
        siteName: 'Miss Genius',
        basePath,
        logoPath: '/icons/icon-192.png',
      }),
      // CSP durcie : script-src par hash SHA-256 de l'IIFE anti-FOUC inline
      // (plus de 'unsafe-inline' en prod). Placé après pwaSeoPlugin pour hasher
      // aussi d'éventuels scripts injectés au build. Directives portées à
      // l'identique depuis l'ancienne meta statique de index.html.
      cspPlugin({
        dev: command === 'serve',
        // Ouvre les hôtes de Google Tag Manager et de GA4. Sans cette
        // option, le script que `ConsentBanner` injecte APRÈS l'accord serait
        // refusé par la politique — et l'échec ne se verrait qu'en console,
        // sur le site déployé, une fois le consentement donné.
        analytics: true,
        connectSrc: ["'self'", 'https://*.workers.dev'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        extraDirectives: {
          'frame-ancestors': "'none'",
        },
      }),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/apple-touch-icon.png',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2,webmanifest}'],
          /*
           * CE QUI EST CHARGÉ À LA DEMANDE NE SE PRÉCACHE PAS, sans quoi le
           * découpage ci-dessus ne servirait à rien : `globPatterns` ramasse
           * TOUT le JS émis, `import()` ou pas.
           *
           * Le moteur Rive y était déjà — optionnel, décoratif, pour garder un
           * shell hors ligne léger sur réseau lent. Sentry le rejoint, pour la
           * même raison et un poids bien plus lourd : mesuré le 16/09/2026 sur
           * la production de deux apps du parc, 345 et 463 KiB bruts de SDK
           * téléchargés par chaque visiteur, sans qu'aucun DSN soit posé.
           *
           * Hors précache, il est cherché sur le réseau à la première erreur,
           * et jamais si l'observabilité reste éteinte. Ne pas l'avoir hors
           * ligne est sans conséquence : rapporter une erreur demande le réseau.
           */
          globIgnores: ['**/rive-*.js', '**/RivePlayer-*.js', '**/sentry-*.js'],
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
          screenshots: [
            {
              src: 'screenshots/mobile.png',
              sizes: '824x1830',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Écran d’accueil sur mobile',
            },
            {
              src: 'screenshots/wide.png',
              sizes: '2560x1600',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Écran d’accueil sur ordinateur',
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
