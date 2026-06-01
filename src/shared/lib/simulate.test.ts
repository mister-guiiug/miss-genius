import { describe, expect, it } from 'vitest';
import type { Grade, Subject } from '../types/domain.ts';
import { type AverageOptions } from './average.ts';
import {
  makeHypotheticalGrade,
  requiredGradeForSubjectAverage,
  requiredSubjectAverageForGeneral,
  simulateFutureGrade,
} from './simulate.ts';

const OPTS: AverageOptions = { referenceBase: 20, normalizeBases: true };

const subjects: Subject[] = [
  { id: 'math', name: 'Maths', weight: 4, color: 'violet' },
  { id: 'hist', name: 'Histoire', weight: 2, color: 'amber' },
];

function g(subjectId: string, value: number, weight = 1, max = 20): Grade {
  return { id: `${subjectId}-${value}`, subjectId, value, max, weight };
}

describe('simulateFutureGrade', () => {
  it('mesure l’impact sur la matière et la moyenne générale', () => {
    const grades = [g('math', 12), g('hist', 14)];
    // math actuel = 12 ; général = (12*4 + 14*2)/6 = 76/6 ≈ 12.6667
    const hypo = makeHypotheticalGrade('math', 18, 20, 1);
    const impact = simulateFutureGrade(subjects, grades, hypo, OPTS);

    expect(impact.subjectBefore).toBe(12);
    expect(impact.subjectAfter).toBe(15); // (12+18)/2
    expect(impact.subjectDelta).toBe(3);
    expect(impact.generalAfter! > impact.generalBefore!).toBe(true);
    expect(impact.generalDelta).toBeGreaterThan(0);
  });

  it('gère une matière initialement vide', () => {
    const hypo = makeHypotheticalGrade('math', 16, 20, 1);
    const impact = simulateFutureGrade(subjects, [], hypo, OPTS);
    expect(impact.subjectBefore).toBeNull();
    expect(impact.subjectAfter).toBe(16);
    expect(impact.subjectDelta).toBeNull();
  });
});

describe('requiredGradeForSubjectAverage', () => {
  it('calcule la note nécessaire pour atteindre une moyenne de matière', () => {
    // une note 12/20 coef 1 ; viser 14 avec une éval coef 1 sur 20
    // x = (14*(1+1) - 12)/1 = 16
    const r = requiredGradeForSubjectAverage([g('math', 12)], 14, 1, 20, OPTS);
    expect(r.reason).toBe('ok');
    expect(r.required).toBeCloseTo(16, 6);
  });

  it('dé-normalise vers le barème de la prochaine évaluation', () => {
    // viser 10/20 sans note existante, prochaine éval sur 10 -> 5/10
    const r = requiredGradeForSubjectAverage([], 10, 1, 10, OPTS);
    expect(r.required).toBeCloseTo(5, 6);
  });

  it('signale « déjà atteint » quand une note ≤ 0 suffirait', () => {
    // 18/20 coef 3 ; viser 10 avec une éval coef 1 : même un 0 garde 13,5 ≥ 10.
    const r = requiredGradeForSubjectAverage(
      [g('math', 18, 3)],
      10,
      1,
      20,
      OPTS
    );
    expect(r.reason).toBe('already-reached');
    expect(r.required).toBe(0);
  });

  it('signale l’impossibilité quand il faudrait dépasser le barème', () => {
    // note 5/20 coef 3 ; viser 18 avec une éval coef 1 -> impossible
    const r = requiredGradeForSubjectAverage(
      [g('math', 5, 3)],
      18,
      1,
      20,
      OPTS
    );
    expect(r.reason).toBe('impossible-too-high');
    expect(r.clamped).toBe(20);
  });

  it('rejette les entrées invalides', () => {
    expect(requiredGradeForSubjectAverage([], 14, 0, 20, OPTS).reason).toBe(
      'invalid-input'
    );
    expect(requiredGradeForSubjectAverage([], 99, 1, 20, OPTS).reason).toBe(
      'invalid-input'
    );
  });
});

describe('requiredSubjectAverageForGeneral', () => {
  it('calcule la moyenne de matière requise pour une moyenne générale cible', () => {
    const grades = [g('math', 10), g('hist', 14)];
    // général actuel = (10*4 + 14*2)/6 = 68/6 ≈ 11.33
    // viser 13 : math' = (13*6 - 14*2)/4 = (78-28)/4 = 12.5
    const r = requiredSubjectAverageForGeneral(
      subjects,
      grades,
      'math',
      13,
      OPTS
    );
    expect(r.reason).toBe('ok');
    expect(r.requiredAverage).toBeCloseTo(12.5, 6);
  });

  it('impossible si la cible dépasse ce qu’une seule matière peut compenser', () => {
    const grades = [g('math', 5), g('hist', 5)];
    const r = requiredSubjectAverageForGeneral(
      subjects,
      grades,
      'math',
      19,
      OPTS
    );
    expect(r.reason).toBe('impossible-too-high');
  });
});
