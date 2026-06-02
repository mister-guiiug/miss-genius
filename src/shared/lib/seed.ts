import type { AppData, Scenario, Settings } from '../types/domain.ts';
import { createId } from './id.ts';

export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  referenceBase: 20,
  rounding: { mode: 'nearest', decimals: 2 },
  normalizeBases: true,
  theme: 'light',
  lockSubjectOrder: true,
  gradeSort: 'date-desc',
};

/** Scénario vide nommé (point de départ de toute simulation). */
export function createEmptyScenario(name = 'Mon bulletin'): Scenario {
  const now = Date.now();
  return {
    id: createId('scn'),
    name,
    subjects: [],
    grades: [],
    goal: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Données initiales d'une première installation (sans contenu de démo). */
export function createInitialData(): AppData {
  const base = createEmptyScenario();
  return {
    version: SCHEMA_VERSION,
    scenarios: [base],
    activeScenarioId: base.id,
    settings: DEFAULT_SETTINGS,
    onboarded: false,
  };
}
