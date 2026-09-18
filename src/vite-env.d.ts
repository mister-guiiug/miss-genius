/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Clé de projet PostHog (`phc_…`), nuage EUROPÉEN — ADR 0012. LA MÊME pour
   * tout le parc, et c'est délibéré : un seul projet, les applications
   * distinguées dedans par la super-propriété `app_name` que le socle déduit
   * du chemin de base. L'inverse — un projet par dépôt — rendait le total
   * illisible. Publique par conception (elle part dans le bundle), donc
   * `vars` et jamais `secrets`. Absente, le bandeau de consentement ne rend
   * rien et rien n'est mesuré : c'est le seul interrupteur.
   */
  readonly VITE_POSTHOG_KEY?: string;
  /** URL du proxy Pronote (Cloudflare Worker). Vide = connecteur désactivé. */
  readonly VITE_PRONOTE_PROXY_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
}

/**
 * Injecté par Vite (`define`) — la version applicative lue dans package.json.
 * Le `define` existait déjà ; il n'était pas DÉCLARÉ, donc invisible du
 * type-check. `initSentry({ release })` est le premier appel à en avoir besoin.
 */
declare const __APP_VERSION__: string;
