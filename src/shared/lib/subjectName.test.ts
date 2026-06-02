import { describe, expect, it } from 'vitest';
import { normalizeSubjectName, subjectNameTaken } from './subjectName.ts';

const subjects = [
  { id: 'a', name: 'Mathématiques' },
  { id: 'b', name: 'Histoire-Géographie' },
];

describe('normalizeSubjectName', () => {
  it('trim, réduit les espaces et ignore la casse', () => {
    expect(normalizeSubjectName('  Maths   SVT ')).toBe('maths svt');
    expect(normalizeSubjectName('FRANÇAIS')).toBe('français');
  });
});

describe('subjectNameTaken', () => {
  it('détecte un doublon insensible à la casse et aux espaces', () => {
    expect(subjectNameTaken(subjects, 'mathématiques')).toBe(true);
    expect(subjectNameTaken(subjects, '  Mathématiques ')).toBe(true);
  });

  it('ignore la matière en cours d’édition (exceptId)', () => {
    expect(subjectNameTaken(subjects, 'Mathématiques', 'a')).toBe(false);
    // …mais renommer A vers le nom de B reste bloqué
    expect(subjectNameTaken(subjects, 'Histoire-Géographie', 'a')).toBe(true);
  });

  it('laisse passer un nom inédit ou vide', () => {
    expect(subjectNameTaken(subjects, 'Anglais')).toBe(false);
    expect(subjectNameTaken(subjects, '   ')).toBe(false);
  });
});
