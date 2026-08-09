/**
 * Point d'entrée i18n de l'app : instancie le contexte isolé via le helper
 * partagé `createI18n` et expose `I18nProvider` / `useI18n` typés sur le
 * catalogue local. À importer partout via `'../i18n'`.
 */
import { createI18n } from '@mister-guiiug/dev-wpa-config/react/i18n';
import { messages, type Locale } from './messages';

export type { Locale, Messages } from './messages';

export const { I18nProvider, useI18n } = createI18n({
  messages,
  locales: ['fr', 'en'],
  fallbackLocale: 'fr',
  storageKey: 'genius_locale',
});

/**
 * Catégorie de pluriel (`'one'` | `'other'`) pour une locale et un compte,
 * selon les règles CLDR (`Intl.PluralRules`) : « 0 note » est singulier en
 * français mais « 0 grades » est pluriel en anglais. Les messages pluralisables
 * fournissent les sous-clés `one`/`other` ; on choisit ici la bonne. Le type de
 * retour est volontairement restreint à `'one' | 'other'` pour rester
 * type-safe côté `t(\`x.${plural(locale, n)}\`)`.
 */
export function plural(locale: Locale, count: number): 'one' | 'other' {
  return new Intl.PluralRules(locale).select(count) === 'one' ? 'one' : 'other';
}
