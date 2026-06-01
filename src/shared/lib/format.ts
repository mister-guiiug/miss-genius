import { applyRounding } from './average.ts';
import type { RoundingConfig } from '../types/domain.ts';

/** Formate une moyenne (ou « — » si absente) selon l'arrondi configuré. */
export function formatAverage(
  value: number | null,
  rounding: RoundingConfig,
  base = 20
): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const rounded = applyRounding(value, rounding);
  return `${rounded.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(rounding.decimals, 1),
  })}/${base}`;
}

/** Delta signé lisible : +0,8 / −1,2 / =. */
export function formatDelta(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const r = Math.round(value * 100) / 100;
  if (r === 0) return '=';
  const sign = r > 0 ? '+' : '−';
  return `${sign}${Math.abs(r).toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
  })}`;
}

export type Trend = 'up' | 'down' | 'flat';

export function deltaTrend(value: number | null): Trend {
  if (value === null || Math.abs(value) < 0.005) return 'flat';
  return value > 0 ? 'up' : 'down';
}
