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
import { createId } from '../shared/lib/id.ts';
import { normalizeSubjectName } from '../shared/lib/subjectName.ts';
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

  // Notes (scénario actif)
  addGrade: (input: Omit<Grade, 'id'>) => void;
  updateGrade: (id: string, patch: Partial<Omit<Grade, 'id'>>) => void;
  deleteGrade: (id: string) => void;

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
        if (
          from === to ||
          from < 0 ||
          from > last ||
          to < 0 ||
          to > last
        ) {
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
        grades: [...sc.grades, { ...input, id: createId('grd') }],
      })),

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
