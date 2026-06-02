import { describe, expect, it } from 'vitest';
import { guessSubjectIcon, planFromPronote } from './pronoteMapping.ts';
import type { PronoteResponse } from './pronoteContract.ts';

describe('guessSubjectIcon', () => {
  it('devine l’icône selon des mots-clés', () => {
    expect(guessSubjectIcon('Mathématiques')).toBe('calculator');
    expect(guessSubjectIcon('Histoire-Géographie')).toBe('globe');
    expect(guessSubjectIcon('Anglais LV1')).toBe('language');
    expect(guessSubjectIcon('Matière inconnue')).toBe('book');
  });
});

describe('planFromPronote', () => {
  const resp: PronoteResponse = {
    ok: true,
    grades: [
      { subject: 'Maths', value: 15, max: 20, coefficient: 2 },
      { subject: 'maths', value: 10, max: 20 }, // même matière (casse)
      { subject: 'Anglais', value: 16, max: 20 },
      { subject: 'Maths', value: 99, max: 20 }, // invalide -> ignorée
    ],
  };

  it('groupe les matières par nom (dédup casse) et mappe les notes', () => {
    const plan = planFromPronote(resp);
    expect(plan.subjects.map(s => s.name)).toEqual(['Maths', 'Anglais']);
    // 3 notes valides (la note 99/20 est filtrée)
    expect(plan.grades).toHaveLength(3);
    expect(plan.grades[0]).toMatchObject({
      subjectName: 'Maths',
      value: 15,
      weight: 2,
    });
    // coefficient par défaut = 1
    expect(plan.grades[1]!.weight).toBe(1);
  });

  it('assigne une couleur et une icône à chaque matière', () => {
    const plan = planFromPronote(resp);
    expect(plan.subjects[0]).toMatchObject({ icon: 'calculator' });
    expect(plan.subjects.every(s => typeof s.color === 'string')).toBe(true);
  });
});
