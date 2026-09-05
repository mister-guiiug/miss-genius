/**
 * Tests d'USAGE, pas de mécanique : `formatNumber` est éprouvé chez le socle.
 * Ce qui compte ici, c'est que l'écran affiche la moyenne dans la langue
 * choisie — c'est précisément ce que le `'fr-FR'` figé empêchait.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  getDefaultLocale,
  setDefaultLocale,
} from '@mister-guiiug/dev-pwa-config/format';
import { deltaTrend, formatAverage, formatDelta } from './format.ts';
import type { RoundingConfig } from '../types/domain.ts';

const rounding: RoundingConfig = { mode: 'nearest', decimals: 2 };

// La locale par défaut du socle est un état de module : la reposer évite qu'un
// test en contamine un autre.
const initial = getDefaultLocale();
afterEach(() => setDefaultLocale(initial));

describe('formatAverage', () => {
  it('affiche la moyenne sur sa base, virgule décimale en français', () => {
    expect(formatAverage(14.53, rounding, 20)).toBe('14,53/20');
    expect(formatAverage(75.5, rounding, 100)).toBe('75,5/100');
  });

  it('suit la langue de l’app : point décimal en anglais', () => {
    setDefaultLocale('en-GB');
    expect(formatAverage(14.53, rounding, 20)).toBe('14.53/20');
  });

  it('accepte une locale explicite sans toucher au défaut', () => {
    expect(formatAverage(14.53, rounding, 20, 'en-GB')).toBe('14.53/20');
    expect(formatAverage(14.53, rounding, 20)).toBe('14,53/20');
  });

  it('rend un tiret quand la moyenne n’existe pas', () => {
    expect(formatAverage(null, rounding)).toBe('—');
    expect(formatAverage(Number.NaN, rounding)).toBe('—');
  });
});

describe('formatDelta', () => {
  it('signe le delta et garde le moins typographique', () => {
    expect(formatDelta(0.8)).toBe('+0,8');
    expect(formatDelta(-1.24)).toBe('−1,24');
    expect(formatDelta(0)).toBe('=');
    expect(formatDelta(null)).toBe('—');
  });

  it('suit la langue de l’app', () => {
    setDefaultLocale('en-GB');
    expect(formatDelta(-1.24)).toBe('−1.24');
  });
});

describe('deltaTrend', () => {
  it('classe hausse, baisse et stagnation', () => {
    expect(deltaTrend(0.4)).toBe('up');
    expect(deltaTrend(-0.4)).toBe('down');
    expect(deltaTrend(0.001)).toBe('flat');
    expect(deltaTrend(null)).toBe('flat');
  });
});
