import type { ImportPlan } from '../../shared/types/import.ts';
import {
  SUBJECT_COLORS,
  type SubjectColor,
} from '../../shared/types/domain.ts';
import type { SubjectIconKey } from '../../shared/lib/subjectIcons.ts';
import { normalizeSubjectName } from '../../shared/lib/subjectName.ts';
import type { PronoteResponse } from './pronoteContract.ts';

/** Devine une icône de matière à partir de mots-clés du nom (heuristique). */
export function guessSubjectIcon(name: string): SubjectIconKey {
  const n = name.toLocaleLowerCase('fr');
  const has = (...kw: string[]) => kw.some(k => n.includes(k));
  if (has('math')) return 'calculator';
  if (has('phys', 'chim')) return 'chemistry';
  if (has('svt', 'biolog', 'vie et terre')) return 'biology';
  if (has('physique-chimie')) return 'physics';
  if (has('hist', 'géo', 'geo')) return 'globe';
  if (has('angl', 'espagn', 'allem', 'langue', 'lv1', 'lv2', 'llce'))
    return 'language';
  if (has('franç', 'franc', 'lettres')) return 'language';
  if (has('philo')) return 'philosophy';
  if (has('eps', 'sport')) return 'sport';
  if (has('art', 'plast', 'dessin')) return 'art';
  if (has('musi')) return 'music';
  if (has('techno', 'sti')) return 'tech';
  if (has('nsi', 'info', 'snt')) return 'computer';
  if (has('ses', 'éco', 'eco')) return 'economics';
  if (has('emc', 'droit', 'moral')) return 'law';
  if (has('théât', 'theat')) return 'drama';
  return 'book';
}

function isUsable(value: number, max: number): boolean {
  return (
    Number.isFinite(value) &&
    Number.isFinite(max) &&
    max > 0 &&
    value >= 0 &&
    value <= max
  );
}

/**
 * Transforme une réponse Pronote normalisée en {@link ImportPlan} :
 *  - une matière par nom distinct (couleur cyclique, icône devinée) ;
 *  - une note par évaluation exploitable (notes invalides ignorées).
 *  Fonction pure -> testable sans réseau.
 */
export function planFromPronote(resp: PronoteResponse): ImportPlan {
  const subjects = new Map<
    string,
    { name: string; weight: number; color: SubjectColor; icon: SubjectIconKey }
  >();
  const grades: ImportPlan['grades'] = [];
  let colorIndex = 0;

  for (const g of resp.grades) {
    const name = g.subject.trim();
    if (!name || !isUsable(g.value, g.max)) continue;
    const key = normalizeSubjectName(name);
    if (!subjects.has(key)) {
      subjects.set(key, {
        name,
        weight: 1,
        color: SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length]!,
        icon: guessSubjectIcon(name),
      });
      colorIndex += 1;
    }
    grades.push({
      subjectName: name,
      value: g.value,
      max: g.max,
      weight: g.coefficient && g.coefficient > 0 ? g.coefficient : 1,
      date: g.date,
      label: g.label,
    });
  }

  return { subjects: [...subjects.values()], grades };
}
