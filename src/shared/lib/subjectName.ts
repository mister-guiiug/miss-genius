import type { Subject } from '../types/domain.ts';

/**
 * Normalise un nom de matière pour la comparaison de doublons : trim, espaces
 * internes réduits, casse ignorée. Les accents restent significatifs
 * (« Maths » ≠ « Maths SVT », mais « maths » == « Maths » == «  Maths  »).
 */
export function normalizeSubjectName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');
}

/**
 * Vrai si `name` correspond déjà (à la casse/aux espaces près) à une matière
 * existante, en ignorant éventuellement une matière (`exceptId`, utile en édition).
 */
export function subjectNameTaken(
  subjects: Pick<Subject, 'id' | 'name'>[],
  name: string,
  exceptId?: string
): boolean {
  const target = normalizeSubjectName(name);
  if (!target) return false;
  return subjects.some(
    s => s.id !== exceptId && normalizeSubjectName(s.name) === target
  );
}
