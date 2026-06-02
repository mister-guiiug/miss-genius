import type { Grade, GradeSort } from '../types/domain.ts';

/**
 * Trie une liste de notes pour l'affichage (fonction pure, ne mute pas l'entrée).
 *
 * Règles :
 *  - `added` : conserve l'ordre de saisie (ordre stocké).
 *  - `date-desc` / `date-asc` : tri par date ISO ; les notes **sans date** sont
 *    toujours reléguées en fin de liste (date inconnue), dans leur ordre de saisie.
 *  - `value-desc` : meilleure note d'abord, comparée en proportion (`value/max`)
 *    pour rester juste entre barèmes différents.
 *  Les égalités sont départagées par l'ordre de saisie (tri stable).
 */
export function sortGrades(grades: Grade[], mode: GradeSort): Grade[] {
  if (mode === 'added') return [...grades];

  return grades
    .map((g, i) => ({ g, i }))
    .sort((a, b) => {
      if (mode === 'value-desc') {
        const ratio = (x: Grade) => (x.max > 0 ? x.value / x.max : 0);
        const diff = ratio(b.g) - ratio(a.g);
        return diff !== 0 ? diff : a.i - b.i;
      }

      // Modes par date : non datées toujours en fin.
      const da = a.g.date ?? '';
      const db = b.g.date ?? '';
      if (!da && !db) return a.i - b.i;
      if (!da) return 1;
      if (!db) return -1;
      const cmp = da.localeCompare(db); // croissant (les ISO se comparent bien)
      if (cmp !== 0) return mode === 'date-asc' ? cmp : -cmp;
      return a.i - b.i;
    })
    .map(x => x.g);
}
