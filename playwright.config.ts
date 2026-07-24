import { defineConfig, devices } from '@playwright/test';
import { definePwaPlaywrightConfig } from '@mister-guiiug/dev-wpa-config/playwright-base';

// Factory famille : matrice navigateurs, reporters, snapshots, reducedMotion.
// `preview: true` (dev-wpa-config 3.x) : les e2e testent un BUILD de prod
// (service worker, minification, cache réels). VITE_BASE_PATH=/ neutralise le
// base path GitHub Pages ; port 4173 pour ne pas collisionner avec un dev
// server (5173). Non exécuté en CI (run-e2e: false) — local :
// `npx playwright install` puis `npm run test:e2e`.
export default defineConfig(
  definePwaPlaywrightConfig({
    devices,
    testMatch: /.*\.spec\.ts$/,
    preview: true,
    port: 4173,
    command:
      'cross-env VITE_BASE_PATH=/ npm run build && cross-env VITE_BASE_PATH=/ vite preview --port 4173 --strictPort',
  })
);
