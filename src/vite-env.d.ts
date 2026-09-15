/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Identifiant de mesure GA4 (`G-…`), propre à CETTE application. Absent, le
   * bandeau de consentement ne rend rien et rien n'est mesuré : c'est le seul
   * interrupteur, et une propriété par site est ce qui rend le suivi
   * indépendant.
   */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** URL du proxy Pronote (Cloudflare Worker). Vide = connecteur désactivé. */
  readonly VITE_PRONOTE_PROXY_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
}
