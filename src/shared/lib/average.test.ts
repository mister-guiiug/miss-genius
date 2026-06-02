import { describe, expect, it } from 'vitest';
import type { Grade, Subject } from '../types/domain.ts';
import {
  applyRounding,
  computeSubjectResults,
  generalAverage,
  isUsableGrade,
  normalizeValue,
  simpleAverage,
  subjectAverage,
  type AverageOptions,
} from './average.ts';

const OPTS: AverageOptions = { referenceBase: 20, normalizeBases: true };

function grade(partial: Partial<Grade>): Grade {
  return {
    id: partial.id ?? 'g',
    subjectId: partial.subjectId ?? 's',
    periodId: partial.periodId ?? 'p',
    value: partial.value ?? 0,
    max: partial.max ?? 20,
    weight: partial.weight ?? 1,
    ...partial,
  };
}

function subject(partial: Partial<Subject>): Subject {
  return {
    id: partial.id ?? 's',
    name: partial.name ?? 'Matière',
    weight: partial.weight ?? 1,
    color: partial.color ?? 'violet',
    ...partial,
  };
}

describe('isUsableGrade', () => {
  it('accepte une note valide', () => {
    expect(isUsableGrade(grade({ value: 14 }))).toBe(true);
  });
  it('rejette coefficient nul, NaN, valeur hors barème', () => {
    expect(isUsableGrade(grade({ weight: 0 }))).toBe(false);
    expect(isUsableGrade(grade({ value: Number.NaN }))).toBe(false);
    expect(isUsableGrade(grade({ value: 25, max: 20 }))).toBe(false);
    expect(isUsableGrade(grade({ value: -1 }))).toBe(false);
    expect(isUsableGrade(grade({ max: 0 }))).toBe(false);
  });
});

describe('normalizeValue', () => {
  it('ramène une note sur la base de référence', () => {
    expect(normalizeValue(8, 10, 20)).toBe(16);
    expect(normalizeValue(75, 100, 20)).toBe(15);
  });
});

describe('applyRounding', () => {
  it('arrondit au plus proche', () => {
    expect(applyRounding(13.456, { mode: 'nearest', decimals: 2 })).toBe(13.46);
  });
  it('plancher et plafond', () => {
    expect(applyRounding(13.99, { mode: 'floor', decimals: 0 })).toBe(13);
    expect(applyRounding(13.01, { mode: 'ceil', decimals: 0 })).toBe(14);
  });
  it('none nettoie seulement le bruit flottant', () => {
    expect(applyRounding(0.1 + 0.2, { mode: 'none', decimals: 2 })).toBe(0.3);
  });
});

describe('subjectAverage', () => {
  it('renvoie null sans note exploitable', () => {
    expect(subjectAverage([], OPTS)).toBeNull();
    expect(subjectAverage([grade({ weight: 0 })], OPTS)).toBeNull();
  });

  it('moyenne pondérée par coefficient de note', () => {
    // (12*1 + 16*3) / (1+3) = 60/4 = 15
    const avg = subjectAverage(
      [grade({ value: 12, weight: 1 }), grade({ value: 16, weight: 3 })],
      OPTS
    );
    expect(avg).toBe(15);
  });

  it('normalise les bases différentes quand activé', () => {
    // 8/10 -> 16 ; 18/20 -> 18 ; moyenne simple coef 1 = 17
    const avg = subjectAverage(
      [grade({ value: 8, max: 10 }), grade({ value: 18, max: 20 })],
      OPTS
    );
    expect(avg).toBe(17);
  });

  it('ignore les bases différentes quand la normalisation est désactivée', () => {
    const avg = subjectAverage(
      [grade({ value: 8, max: 10 }), grade({ value: 18, max: 20 })],
      { referenceBase: 20, normalizeBases: false }
    );
    expect(avg).toBe(18); // seule la note /20 est comptée
  });
});

describe('simpleAverage', () => {
  it('moyenne arithmétique simple', () => {
    expect(simpleAverage([10, 20])).toBe(15);
    expect(simpleAverage([])).toBeNull();
  });
});

describe('generalAverage', () => {
  it('pondère par coefficient de matière, exclut les matières vides', () => {
    const subjects = [
      subject({ id: 'math', weight: 4 }),
      subject({ id: 'hist', weight: 2 }),
      subject({ id: 'sport', weight: 1 }), // sans note -> exclu
    ];
    const grades = [
      grade({ subjectId: 'math', value: 15 }),
      grade({ subjectId: 'hist', value: 12 }),
    ];
    const results = computeSubjectResults(subjects, grades, OPTS);
    // (15*4 + 12*2) / (4+2) = 84/6 = 14
    expect(generalAverage(results)).toBe(14);
  });

  it('renvoie null si aucune matière ne contribue', () => {
    const results = computeSubjectResults([subject({})], [], OPTS);
    expect(generalAverage(results)).toBeNull();
  });
});
