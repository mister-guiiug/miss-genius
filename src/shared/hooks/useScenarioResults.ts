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
 * Calcule (mémoïsé) les moyennes d'un scénario. La memoization est justifiée :
 * recalculer toutes les matières à chaque rendu serait inutile tant que notes,
 * matières et réglages n'ont pas changé.
 */
export function useScenarioResults(
  scenario: Scenario,
  settings: Settings
): ScenarioResults {
  return useMemo(() => {
    const options: AverageOptions = {
      referenceBase: settings.referenceBase,
      normalizeBases: settings.normalizeBases,
    };
    const subjectResults = computeSubjectResults(
      scenario.subjects,
      scenario.grades,
      options
    );
    return {
      options,
      subjectResults,
      general: generalAverage(subjectResults),
    };
  }, [scenario.subjects, scenario.grades, settings]);
}
