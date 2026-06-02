/**
 * Simulation d'hypothèses : impact d'une note future et calcul de note cible.
 * Pures et testables, comme {@link ./average.ts}.
 */

import type { Grade, Subject } from '../types/domain.ts';
import {
  computeSubjectResults,
  generalAverage,
  isUsableGrade,
  normalizeValue,
  type AverageOptions,
} from './average.ts';

/** Crée une note hypothétique normalisable (id fictif, non persistée). */
export function makeHypotheticalGrade(
  subjectId: string,
  value: number,
  max: number,
  weight: number
): Grade {
  // periodId non pertinent : la note hypothétique n'est jamais persistée et le
  // moteur ne filtre pas par période (les listes lui arrivent déjà filtrées).
  return {
    id: '__hypothetical__',
    subjectId,
    periodId: '',
    value,
    max,
    weight,
  };
}

export interface SimulationImpact {
  /** Moyenne générale avant / après l'ajout de la note hypothétique. */
  generalBefore: number | null;
  generalAfter: number | null;
  /** Delta sur la moyenne générale (after - before), ou null si incalculable. */
  generalDelta: number | null;
  subjectBefore: number | null;
  subjectAfter: number | null;
  subjectDelta: number | null;
}

/** Mesure l'impact d'une note future sur une matière et la moyenne générale. */
export function simulateFutureGrade(
  subjects: Subject[],
  grades: Grade[],
  hypothetical: Grade,
  options: AverageOptions
): SimulationImpact {
  const before = computeSubjectResults(subjects, grades, options);
  const after = computeSubjectResults(
    subjects,
    [...grades, hypothetical],
    options
  );

  const subjectBefore =
    before.find(r => r.subject.id === hypothetical.subjectId)?.average ?? null;
  const subjectAfter =
    after.find(r => r.subject.id === hypothetical.subjectId)?.average ?? null;
  const generalBefore = generalAverage(before);
  const generalAfter = generalAverage(after);

  return {
    generalBefore,
    generalAfter,
    generalDelta:
      generalBefore !== null && generalAfter !== null
        ? generalAfter - generalBefore
        : null,
    subjectBefore,
    subjectAfter,
    subjectDelta:
      subjectBefore !== null && subjectAfter !== null
        ? subjectAfter - subjectBefore
        : null,
  };
}

/** Pourquoi une note cible n'est pas atteignable d'un seul coup. */
export type RequiredReason =
  | 'ok'
  | 'already-reached' // la cible est déjà acquise (note ≤ 0 suffirait)
  | 'impossible-too-high' // il faudrait dépasser le barème
  | 'invalid-input';

export interface RequiredGradeResult {
  /** Note nécessaire sur la prochaine évaluation, exprimée sur `nextMax`. */
  required: number | null;
  reason: RequiredReason;
  /** Note cible bornée au barème (utile pour un message pédagogique). */
  clamped: number | null;
}

/**
 * Note nécessaire dans une matière, sur une prochaine évaluation de coefficient
 * `nextWeight` et de barème `nextMax`, pour atteindre `targetAverage`.
 *
 * Modèle : moyenne pondérée. Avec S = Σ(wᵢ·nᵢ) et W = Σ(wᵢ) sur les notes
 * existantes (normalisées base de référence), la nouvelle moyenne après ajout
 * d'une note x (normalisée) de coefficient w est (S + w·x)/(W + w). On résout :
 *   x = (target·(W + w) − S) / w
 * puis on dé-normalise x vers `nextMax`.
 */
export function requiredGradeForSubjectAverage(
  existingGrades: Grade[],
  targetAverage: number,
  nextWeight: number,
  nextMax: number,
  options: AverageOptions
): RequiredGradeResult {
  if (
    !Number.isFinite(targetAverage) ||
    !(nextWeight > 0) ||
    !(nextMax > 0) ||
    targetAverage < 0 ||
    targetAverage > options.referenceBase
  ) {
    return { required: null, reason: 'invalid-input', clamped: null };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const g of existingGrades) {
    if (!isUsableGrade(g)) continue;
    const onRef = g.max === options.referenceBase;
    if (!onRef && !options.normalizeBases) continue;
    const normalized = onRef
      ? g.value
      : normalizeValue(g.value, g.max, options.referenceBase);
    weightedSum += normalized * g.weight;
    totalWeight += g.weight;
  }

  const neededNormalized =
    (targetAverage * (totalWeight + nextWeight) - weightedSum) / nextWeight;

  // Dé-normalisation vers le barème de la prochaine évaluation.
  const needed = (neededNormalized / options.referenceBase) * nextMax;

  if (needed <= 0) {
    return { required: 0, reason: 'already-reached', clamped: 0 };
  }
  if (needed > nextMax) {
    return {
      required: needed,
      reason: 'impossible-too-high',
      clamped: nextMax,
    };
  }
  return { required: needed, reason: 'ok', clamped: needed };
}

/**
 * Moyenne de matière requise pour qu'une matière donnée hisse la moyenne
 * générale jusqu'à `targetGeneral`, les autres matières restant inchangées.
 */
export function requiredSubjectAverageForGeneral(
  subjects: Subject[],
  grades: Grade[],
  subjectId: string,
  targetGeneral: number,
  options: AverageOptions
): { requiredAverage: number | null; reason: RequiredReason } {
  const subject = subjects.find(s => s.id === subjectId);
  if (
    !subject ||
    !(subject.weight > 0) ||
    !Number.isFinite(targetGeneral) ||
    targetGeneral < 0 ||
    targetGeneral > options.referenceBase
  ) {
    return { requiredAverage: null, reason: 'invalid-input' };
  }

  const results = computeSubjectResults(subjects, grades, options);
  let othersWeighted = 0;
  let totalWeight = 0;
  for (const r of results) {
    if (!(r.subject.weight > 0)) continue;
    totalWeight += r.subject.weight;
    if (r.subject.id === subjectId) continue;
    if (r.average === null) continue;
    othersWeighted += r.average * r.subject.weight;
  }
  if (totalWeight <= 0) {
    return { requiredAverage: null, reason: 'invalid-input' };
  }

  const requiredAverage =
    (targetGeneral * totalWeight - othersWeighted) / subject.weight;

  if (requiredAverage <= 0) {
    return { requiredAverage: 0, reason: 'already-reached' };
  }
  if (requiredAverage > options.referenceBase) {
    return { requiredAverage, reason: 'impossible-too-high' };
  }
  return { requiredAverage, reason: 'ok' };
}
