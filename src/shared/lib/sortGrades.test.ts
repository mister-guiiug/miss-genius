import { describe, expect, it } from 'vitest';
import type { Grade } from '../types/domain.ts';
import { sortGrades } from './sortGrades.ts';

function g(id: string, value: number, date?: string, max = 20): Grade {
  return { id, subjectId: 's', periodId: 'p', value, max, weight: 1, date };
}

// Ordre de saisie : g2 (oct) , g1 (sep) , g4 (sans date) , g3 (nov)
const grades = [
  g('g2', 12, '2026-10-01'),
  g('g1', 15, '2026-09-01'),
  g('g4', 8), // sans date
  g('g3', 18, '2026-11-01'),
];

const ids = (gs: Grade[]) => gs.map(x => x.id);

describe('sortGrades', () => {
  it('date-desc : plus récente d’abord, non datées en fin', () => {
    expect(ids(sortGrades(grades, 'date-desc'))).toEqual([
      'g3',
      'g2',
      'g1',
      'g4',
    ]);
  });

  it('date-asc : plus ancienne d’abord, non datées en fin', () => {
    expect(ids(sortGrades(grades, 'date-asc'))).toEqual([
      'g1',
      'g2',
      'g3',
      'g4',
    ]);
  });

  it('added : conserve l’ordre de saisie', () => {
    expect(ids(sortGrades(grades, 'added'))).toEqual(['g2', 'g1', 'g4', 'g3']);
  });

  it('value-desc : meilleure note d’abord (proportion, barèmes mélangés)', () => {
    const mixed = [g('a', 8, undefined, 10), g('b', 15, undefined, 20)];
    // 8/10 = 0.8 > 15/20 = 0.75 -> a avant b
    expect(ids(sortGrades(mixed, 'value-desc'))).toEqual(['a', 'b']);
  });

  it('ne mute pas la liste source', () => {
    const copy = [...grades];
    sortGrades(grades, 'date-desc');
    expect(grades).toEqual(copy);
  });
});
