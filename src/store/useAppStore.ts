/**
 * Store applicatif (Zustand). Source de vérité unique de l'état persisté.
 *
 * Justification du choix : Zustand est déjà la brique d'état de la famille
 * miss-* / mister-*. Léger, sans boilerplate, sélecteurs granulaires (pas de
 * re-render global), et compatible avec une persistance maison versionnée.
 *
 * Toute mutation passe par `commit()` qui réécrit l'état ET le persiste — un
 * seul point de sortie vers le stockage, donc pas d'oubli de sauvegarde.
 */
import { create } from 'zustand';
import type {
  AppData,
  Goal,
  Grade,
  Scenario,
  Settings,
  Subject,
} from '../shared/types/domain.ts';
import type { ImportPlan } from '../shared/types/import.ts';
import { createId } from '../shared/lib/id.ts';
import { normalizeSubjectName } from '../shared/lib/subjectName.ts';
import {
  buildPeriods,
  createPeriod,
  type PeriodPreset,
} from '../shared/lib/periods.ts';
import { createEmptyScenario, DEFAULT_SETTINGS } from '../shared/lib/seed.ts';
import { loadData, saveData } from '../shared/lib/storage.ts';

interface AppState {
  data: AppData;

  // Onboarding & thème
  completeOnboarding: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateSettings: (patch: Partial<Settings>) => void;

  // Scénarios
  setActiveScenario: (id: string) => void;
  addScenario: (name: string) => string;
  duplicateScenario: (id: string) => string;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;

  // Matières (scénario actif)
  addSubject: (input: Omit<Subject, 'id'>) => void;
  addSubjects: (inputs: Omit<Subject, 'id'>[]) => void;
  updateSubject: (id: string, patch: Partial<Omit<Subject, 'id'>>) => void;
  deleteSubject: (id: string) => void;
  /** Réordonne les matières (glisser-déposer) : déplace l'index `from` vers `to`. */
  reorderSubjects: (from: number, to: number) => void;

  // Notes (scénario actif) — periodId par défaut = période active
  addGrade: (
    input: Omit<Grade, 'id' | 'periodId'> & { periodId?: string }
  ) => void;
  addGrades: (
    inputs: Array<Omit<Grade, 'id' | 'periodId'> & { periodId?: string }>
  ) => void;
  updateGrade: (id: string, patch: Partial<Omit<Grade, 'id'>>) => void;
  deleteGrade: (id: string) => void;

  /**
   * Import en lot (Pronote, démo, …) : crée les matières manquantes (dédup par
   * nom) puis ajoute les notes dans `periodId`. Renvoie un récapitulatif.
   */
  importSubjectsAndGrades: (
    plan: ImportPlan,
    periodId: string
  ) => { subjectsCreated: number; gradesAdded: number };

  // Périodes (scénario actif)
  setActivePeriod: (id: string) => void;
  addPeriod: (name: string) => void;
  renamePeriod: (id: string, name: string) => void;
  deletePeriod: (id: string) => void;
  applyPeriodPreset: (preset: PeriodPreset) => void;

  // Objectif (scénario actif)
  setGoal: (goal: Omit<Goal, 'id'>) => void;
  clearGoal: () => void;

  // Données globales
  replaceData: (data: AppData) => void;
  resetAll: () => void;
}

function persist(data: AppData): AppData {
  saveData(data);
  return data;
}

export const useAppStore = create<AppState>((set, get) => {
  /** Met à jour le scénario actif via un updater immuable + persiste. */
  function mutateActive(updater: (scenario: Scenario) => Scenario): void {
    const { data } = get();
    const scenarios = data.scenarios.map(s =>
      s.id === data.activeScenarioId
        ? { ...updater(s), updatedAt: Date.now() }
        : s
    );
    set({ data: persist({ ...data, scenarios }) });
  }

  return {
    data: loadData(),

    completeOnboarding: () =>
      set(s => ({ data: persist({ ...s.data, onboarded: true }) })),

    setTheme: theme => {
      document.documentElement.dataset.theme = theme;
      set(s => ({
        data: persist({
          ...s.data,
          settings: { ...s.data.settings, theme },
        }),
      }));
    },

    updateSettings: patch =>
      set(s => ({
        data: persist({
          ...s.data,
          settings: { ...s.data.settings, ...patch },
        }),
      })),

    setActiveScenario: id =>
      set(s => ({ data: persist({ ...s.data, activeScenarioId: id }) })),

    addScenario: name => {
      const scenario = createEmptyScenario(name || 'Nouveau scénario');
      set(s => ({
        data: persist({
          ...s.data,
          scenarios: [...s.data.scenarios, scenario],
          activeScenarioId: scenario.id,
        }),
      }));
      return scenario.id;
    },

    duplicateScenario: id => {
      const source = get().data.scenarios.find(s => s.id === id);
      const now = Date.now();
      const copy: Scenario = source
        ? {
            ...structuredClone(source),
            id: createId('scn'),
            name: `${source.name} (copie)`,
            createdAt: now,
            updatedAt: now,
          }
        : createEmptyScenario();
      set(s => ({
        data: persist({
          ...s.data,
          scenarios: [...s.data.scenarios, copy],
          activeScenarioId: copy.id,
        }),
      }));
      return copy.id;
    },

    renameScenario: (id, name) =>
      set(s => ({
        data: persist({
          ...s.data,
          scenarios: s.data.scenarios.map(sc =>
            sc.id === id ? { ...sc, name, updatedAt: Date.now() } : sc
          ),
        }),
      })),

    deleteScenario: id =>
      set(s => {
        if (s.data.scenarios.length <= 1) return s; // toujours ≥ 1 scénario
        const scenarios = s.data.scenarios.filter(sc => sc.id !== id);
        const activeScenarioId =
          s.data.activeScenarioId === id
            ? scenarios[0]!.id
            : s.data.activeScenarioId;
        return { data: persist({ ...s.data, scenarios, activeScenarioId }) };
      }),

    addSubject: input =>
      mutateActive(sc => ({
        ...sc,
        subjects: [...sc.subjects, { ...input, id: createId('sub') }],
      })),

    addSubjects: inputs =>
      mutateActive(sc => {
        // Anti-doublon : ignore les noms déjà présents ou répétés dans le lot.
        const seen = new Set(
          sc.subjects.map(s => normalizeSubjectName(s.name))
        );
        const added: Subject[] = [];
        for (const input of inputs) {
          const key = normalizeSubjectName(input.name);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          added.push({ ...input, id: createId('sub') });
        }
        return { ...sc, subjects: [...sc.subjects, ...added] };
      }),

    updateSubject: (id, patch) =>
      mutateActive(sc => ({
        ...sc,
        subjects: sc.subjects.map(sub =>
          sub.id === id ? { ...sub, ...patch } : sub
        ),
      })),

    deleteSubject: id =>
      mutateActive(sc => ({
        ...sc,
        subjects: sc.subjects.filter(sub => sub.id !== id),
        grades: sc.grades.filter(g => g.subjectId !== id),
        goal:
          sc.goal?.scope.kind === 'subject' && sc.goal.scope.subjectId === id
            ? null
            : sc.goal,
      })),

    reorderSubjects: (from, to) =>
      mutateActive(sc => {
        const last = sc.subjects.length - 1;
        if (from === to || from < 0 || from > last || to < 0 || to > last) {
          return sc; // bornes invalides ou aucun déplacement
        }
        const subjects = [...sc.subjects];
        const [moved] = subjects.splice(from, 1);
        subjects.splice(to, 0, moved!);
        return { ...sc, subjects };
      }),

    addGrade: input =>
      mutateActive(sc => ({
        ...sc,
        grades: [
          ...sc.grades,
          {
            ...input,
            periodId: input.periodId ?? sc.activePeriodId,
            id: createId('grd'),
          },
        ],
      })),

    addGrades: inputs =>
      mutateActive(sc => ({
        ...sc,
        grades: [
          ...sc.grades,
          ...inputs.map(input => ({
            ...input,
            periodId: input.periodId ?? sc.activePeriodId,
            id: createId('grd'),
          })),
        ],
      })),

    importSubjectsAndGrades: (plan, periodId) => {
      let subjectsCreated = 0;
      let gradesAdded = 0;
      mutateActive(sc => {
        const byName = new Map(
          sc.subjects.map(s => [normalizeSubjectName(s.name), s])
        );
        const newSubjects: Subject[] = [];
        for (const sub of plan.subjects) {
          const key = normalizeSubjectName(sub.name);
          if (!key || byName.has(key)) continue;
          const created = { ...sub, id: createId('sub') };
          byName.set(key, created);
          newSubjects.push(created);
        }
        subjectsCreated = newSubjects.length;

        const target = sc.periods.some(p => p.id === periodId)
          ? periodId
          : sc.activePeriodId;
        const newGrades: Grade[] = [];
        for (const g of plan.grades) {
          const subj = byName.get(normalizeSubjectName(g.subjectName));
          if (!subj) continue; // matière introuvable -> note ignorée
          const { subjectName: _name, ...rest } = g;
          newGrades.push({
            ...rest,
            id: createId('grd'),
            subjectId: subj.id,
            periodId: target,
          });
        }
        gradesAdded = newGrades.length;

        return {
          ...sc,
          subjects: [...sc.subjects, ...newSubjects],
          grades: [...sc.grades, ...newGrades],
        };
      });
      return { subjectsCreated, gradesAdded };
    },

    updateGrade: (id, patch) =>
      mutateActive(sc => ({
        ...sc,
        grades: sc.grades.map(g => (g.id === id ? { ...g, ...patch } : g)),
      })),

    deleteGrade: id =>
      mutateActive(sc => ({
        ...sc,
        grades: sc.grades.filter(g => g.id !== id),
      })),

    setActivePeriod: id =>
      mutateActive(sc =>
        sc.periods.some(p => p.id === id) ? { ...sc, activePeriodId: id } : sc
      ),

    addPeriod: name =>
      mutateActive(sc => {
        const p = createPeriod(
          name.trim() || `Période ${sc.periods.length + 1}`
        );
        return { ...sc, periods: [...sc.periods, p], activePeriodId: p.id };
      }),

    renamePeriod: (id, name) =>
      mutateActive(sc => ({
        ...sc,
        periods: sc.periods.map(p =>
          p.id === id ? { ...p, name: name.trim() || p.name } : p
        ),
      })),

    deletePeriod: id =>
      mutateActive(sc => {
        if (sc.periods.length <= 1) return sc; // toujours ≥ 1 période
        const periods = sc.periods.filter(p => p.id !== id);
        const fallback = periods[0]!.id;
        // Les notes de la période supprimée sont rattachées à la première
        // période restante (réaffectation non destructive).
        const grades = sc.grades.map(g =>
          g.periodId === id ? { ...g, periodId: fallback } : g
        );
        const activePeriodId =
          sc.activePeriodId === id ? fallback : sc.activePeriodId;
        return { ...sc, periods, grades, activePeriodId };
      }),

    applyPeriodPreset: preset =>
      mutateActive(sc => {
        const periods = buildPeriods(preset);
        const target = periods[0]!.id;
        // Toutes les notes existantes sont regroupées dans la 1re période.
        const grades = sc.grades.map(g => ({ ...g, periodId: target }));
        return { ...sc, periods, grades, activePeriodId: target };
      }),

    setGoal: goal =>
      mutateActive(sc => ({ ...sc, goal: { ...goal, id: createId('goal') } })),

    clearGoal: () => mutateActive(sc => ({ ...sc, goal: null })),

    replaceData: data => set({ data: persist(data) }),

    resetAll: () => {
      const fresh = createEmptyScenario();
      set({
        data: persist({
          version: get().data.version,
          scenarios: [fresh],
          activeScenarioId: fresh.id,
          settings: DEFAULT_SETTINGS,
          onboarded: true,
        }),
      });
    },
  };
});

/** Sélecteur : scénario actif (toujours défini). */
export function selectActiveScenario(s: AppState): Scenario {
  return (
    s.data.scenarios.find(sc => sc.id === s.data.activeScenarioId) ??
    s.data.scenarios[0]!
  );
}
