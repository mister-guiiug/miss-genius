/**
 * Formatage propre au métier de miss-genius : une moyenne sur une base, et le
 * delta signé qui l'accompagne.
 *
 * CE QUI N'EST PLUS ICI. Le rendu du NOMBRE lui-même passe par
 * `formatNumber` du socle. Les deux fonctions écrivaient
 * `toLocaleString('fr-FR', …)` : l'app se traduit pourtant en anglais, si bien
 * qu'un lecteur anglophone lisait « 14,5/20 » au milieu d'une interface
 * anglaise. `formatNumber` suit la locale par défaut du socle, que
 * `createI18n` déplace à chaque changement de langue (`setDefaultLocale`).
 *
 * CE QUI RESTE ICI, ET POURQUOI. `formatAverage` compose un arrondi métier
 * (`applyRounding`) avec une base de référence (« /20 », « /100 ») ;
 * `formatDelta` rend « = » à zéro et utilise le signe moins typographique
 * (U+2212), qu'`Intl` ne produit pas (`signDisplay` donne un trait d'union).
 * Aucun des deux n'a d'équivalent dans le socle.
 */
import { formatNumber } from '@mister-guiiug/dev-wpa-config/format';
import { applyRounding } from './average.ts';
import type { RoundingConfig } from '../types/domain.ts';

/** Formate une moyenne (ou « — » si absente) selon l'arrondi configuré. */
export function formatAverage(
  value: number | null,
  rounding: RoundingConfig,
  base = 20,
  locale?: string
): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const rounded = applyRounding(value, rounding);
  const text = formatNumber(rounded, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(rounding.decimals, 1),
  });
  return `${text}/${base}`;
}

/** Delta signé lisible : +0,8 / −1,2 / =. */
export function formatDelta(value: number | null, locale?: string): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const r = Math.round(value * 100) / 100;
  if (r === 0) return '=';
  const sign = r > 0 ? '+' : '−';
  const text = formatNumber(Math.abs(r), locale, {
    maximumFractionDigits: 2,
  });
  return `${sign}${text}`;
}

export type Trend = 'up' | 'down' | 'flat';

export function deltaTrend(value: number | null): Trend {
  if (value === null || Math.abs(value) < 0.005) return 'flat';
  return value > 0 ? 'up' : 'down';
}
