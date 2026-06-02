import type { Period } from '../types/domain.ts';
import { createId } from './id.ts';

/** Modèles de découpage de l'année. */
export const PERIOD_PRESETS = ['trimestres', 'semestres', 'annee'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  trimestres: '3 trimestres',
  semestres: '2 semestres',
  annee: 'Année (1 période)',
};

function period(name: string): Period {
  return { id: createId('per'), name };
}

/** Construit la liste de périodes d'un preset (nouveaux identifiants). */
export function buildPeriods(preset: PeriodPreset): Period[] {
  switch (preset) {
    case 'semestres':
      return [period('Semestre 1'), period('Semestre 2')];
    case 'annee':
      return [period('Année')];
    case 'trimestres':
    default:
      return [
        period('Trimestre 1'),
        period('Trimestre 2'),
        period('Trimestre 3'),
      ];
  }
}

/** Période isolée nommée (pour l'ajout manuel). */
export function createPeriod(name: string): Period {
  return period(name);
}
