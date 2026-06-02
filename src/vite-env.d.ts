/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** URL du proxy Pronote (Cloudflare Worker). Vide = connecteur désactivé. */
  readonly VITE_PRONOTE_PROXY_URL?: string;
}
