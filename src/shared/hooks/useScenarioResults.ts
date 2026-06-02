import { useMemo } from 'react';
import {
  computeSubjectResults,
  generalAverage,
  type AverageOptions,
  type SubjectResult,
} from '../lib/average.ts';
import type { Scenario, Settings } from '../types/domain.ts';

export interface ScenarioResults {
  options: AverageOptions;
  subjectResults: SubjectResult[];
  general: number | null;
}

/**
 * Calcule (mémoïsé) les moyennes d'un scénario pour une **période** donnée
 * (par défaut la période active ; `'all'` pour l'année entière).
 *
 * Le filtrage par période a lieu ici, en amont du moteur de calcul qui, lui,
 * reste agnostique (il reçoit une liste de notes déjà filtrée).
 */
export function useScenarioResults(
  scenario: Scenario,
  settings: Settings,
  periodId: string | 'all' = scenario.activePeriodId
): ScenarioResults {
  return useMemo(() => {
    const options: AverageOptions = {
      referenceBase: settings.referenceBase,
      normalizeBases: settings.normalizeBases,
    };
    const grades =
      periodId === 'all'
        ? scenario.grades
        : scenario.grades.filter(g => g.periodId === periodId);
    const subjectResults = computeSubjectResults(
      scenario.subjects,
      grades,
      options
    );
    return {
      options,
      subjectResults,
      general: generalAverage(subjectResults),
    };
  }, [scenario.subjects, scenario.grades, settings, periodId]);
}
