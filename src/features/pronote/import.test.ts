import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { planFromPronote } from './pronoteMapping.ts';
import { MOCK_PRONOTE_RESPONSE } from './mockPronote.ts';

beforeEach(() => {
  localStorage.clear();
  useAppStore.getState().resetAll();
});

describe('importSubjectsAndGrades (Pronote / démo)', () => {
  it('crée les matières et importe les notes dans la période active', () => {
    const plan = planFromPronote(MOCK_PRONOTE_RESPONSE);
    const store = useAppStore.getState();
    const periodId = selectActiveScenario(store).activePeriodId;

    const res = store.importSubjectsAndGrades(plan, periodId);

    expect(res.subjectsCreated).toBe(plan.subjects.length);
    expect(res.gradesAdded).toBe(plan.grades.length);

    const sc = selectActiveScenario(useAppStore.getState());
    expect(sc.subjects).toHaveLength(plan.subjects.length);
    expect(sc.grades).toHaveLength(plan.grades.length);
    expect(sc.grades.every(g => g.periodId === periodId)).toBe(true);
  });

  it('ne recrée pas de matières existantes lors d’un second import', () => {
    const plan = planFromPronote(MOCK_PRONOTE_RESPONSE);
    const periodId = selectActiveScenario(
      useAppStore.getState()
    ).activePeriodId;
    useAppStore.getState().importSubjectsAndGrades(plan, periodId);

    const res2 = useAppStore.getState().importSubjectsAndGrades(plan, periodId);
    expect(res2.subjectsCreated).toBe(0); // dédupliquées par nom
    expect(res2.gradesAdded).toBe(plan.grades.length);
  });
});
