/**
 * Moteur de calcul de Miss Genius — fonctions **pures**, sans état, testables.
 *
 * Toutes les moyennes sont exprimées sur une *base de référence* (par défaut 20).
 * Les notes peuvent être saisies sur des bases différentes (ex. /10, /100) :
 * elles sont normalisées vers la base de référence si `normalizeBases` est actif.
 */

import type {
  Grade,
  RoundingConfig,
  Subject,
} from '../types/domain.ts';

/** Une note est exploitable si ses valeurs sont des nombres finis cohérents. */
export function isUsableGrade(g: Grade): boolean {
  return (
    Number.isFinite(g.value) &&
    Number.isFinite(g.max) &&
    Number.isFinite(g.weight) &&
    g.max > 0 &&
    g.weight > 0 &&
    g.value >= 0 &&
    g.value <= g.max
  );
}

/** Ramène une note sur la base de référence (ex. 14/20 sur base 20 -> 14). */
export function normalizeValue(
  value: number,
  max: number,
  referenceBase: number
): number {
  return (value / max) * referenceBase;
}

/** Arrondi configurable. `none` renvoie la valeur brute. */
export function applyRounding(value: number, cfg: RoundingConfig): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** cfg.decimals;
  switch (cfg.mode) {
    case 'floor':
      return Math.floor(value * factor) / factor;
    case 'ceil':
      return Math.ceil(value * factor) / factor;
    case 'nearest':
      return Math.round(value * factor) / factor;
    case 'none':
    default:
      // Coupe le bruit flottant sans changer la valeur de façon perceptible.
      return Math.round(value * 1e6) / 1e6;
  }
}

export interface AverageOptions {
  referenceBase: number;
  /** Si false, les notes hors base de référence sont ignorées. */
  normalizeBases: boolean;
}

interface WeightedAccumulator {
  weightedSum: number;
  totalWeight: number;
}

function accumulate(
  grades: Grade[],
  { referenceBase, normalizeBases }: AverageOptions
): WeightedAccumulator {
  return grades.reduce<WeightedAccumulator>(
    (acc, g) => {
      if (!isUsableGrade(g)) return acc;
      const onReferenceBase = g.max === referenceBase;
      if (!onReferenceBase && !normalizeBases) return acc;
      const normalized = onReferenceBase
        ? g.value
        : normalizeValue(g.value, g.max, referenceBase);
      acc.weightedSum += normalized * g.weight;
      acc.totalWeight += g.weight;
      return acc;
    },
    { weightedSum: 0, totalWeight: 0 }
  );
}

/**
 * Moyenne d'une matière (pondérée par le coefficient de chaque note).
 * Renvoie `null` si aucune note exploitable (cas limite : matière vide).
 */
export function subjectAverage(
  grades: Grade[],
  options: AverageOptions
): number | null {
  const { weightedSum, totalWeight } = accumulate(grades, options);
  if (totalWeight <= 0) return null;
  return weightedSum / totalWeight;
}

/** Moyenne simple (non pondérée) d'une liste de valeurs déjà normalisées. */
export function simpleAverage(values: number[]): number | null {
  const usable = values.filter(Number.isFinite);
  if (usable.length === 0) return null;
  return usable.reduce((s, v) => s + v, 0) / usable.length;
}

export interface SubjectResult {
  subject: Subject;
  average: number | null;
  gradeCount: number;
}

/** Calcule la moyenne de chaque matière à partir des notes du scénario. */
export function computeSubjectResults(
  subjects: Subject[],
  grades: Grade[],
  options: AverageOptions
): SubjectResult[] {
  return subjects.map(subject => {
    const subjectGrades = grades.filter(g => g.subjectId === subject.id);
    return {
      subject,
      average: subjectAverage(subjectGrades, options),
      gradeCount: subjectGrades.filter(isUsableGrade).length,
    };
  });
}

/**
 * Moyenne générale : moyenne des matières pondérée par le coefficient de matière.
 * Les matières sans note (average null) ou de coefficient nul sont exclues.
 * Renvoie `null` si aucune matière ne contribue.
 */
export function generalAverage(results: SubjectResult[]): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const r of results) {
    if (r.average === null || !(r.subject.weight > 0)) continue;
    weightedSum += r.average * r.subject.weight;
    totalWeight += r.subject.weight;
  }
  if (totalWeight <= 0) return null;
  return weightedSum / totalWeight;
}
