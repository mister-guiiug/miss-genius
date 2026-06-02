import { beforeEach, describe, expect, it } from 'vitest';
import { CLASS_LEVELS } from './subjectCatalog.ts';
import { SUBJECT_ICON_MAP } from '../../shared/lib/subjectIcons.ts';
import { SUBJECT_COLORS } from '../../shared/types/domain.ts';
import { useAppStore } from '../../store/useAppStore.ts';

describe('catalogue de matières par classe', () => {
  it('définit des classes collège et lycée non vides', () => {
    expect(CLASS_LEVELS.length).toBeGreaterThanOrEqual(6);
    expect(CLASS_LEVELS.some(c => c.group === 'Collège')).toBe(true);
    expect(CLASS_LEVELS.some(c => c.group === 'Lycée')).toBe(true);
    for (const level of CLASS_LEVELS) {
      expect(level.subjects.length).toBeGreaterThan(0);
    }
  });

  it('chaque matière suggérée est cohérente (icône, couleur, coef valides)', () => {
    for (const level of CLASS_LEVELS) {
      for (const subject of level.subjects) {
        expect(subject.name.trim().length).toBeGreaterThan(0);
        expect(subject.weight).toBeGreaterThan(0);
        expect(SUBJECT_COLORS).toContain(subject.color);
        // L'icône doit exister dans la table Lucide (garde-fou anti-typo).
        expect(SUBJECT_ICON_MAP).toHaveProperty(subject.icon);
      }
    }
  });
});

describe('addSubjects (activation en lot)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().resetAll();
  });

  it('active toutes les matières d’une classe en une fois', () => {
    const level = CLASS_LEVELS.find(c => c.id === '2nde')!;
    useAppStore.getState().addSubjects(level.subjects);
    const active = useAppStore
      .getState()
      .data.scenarios.find(
        s => s.id === useAppStore.getState().data.activeScenarioId
      )!;
    expect(active.subjects).toHaveLength(level.subjects.length);
    expect(active.subjects.every(s => s.id.length > 0)).toBe(true);
    expect(active.subjects[0]!.name).toBe(level.subjects[0]!.name);
  });

  it('ne crée pas de doublon de nom (activation répétée ou lot redondant)', () => {
    const level = CLASS_LEVELS.find(c => c.id === '2nde')!;
    const store = useAppStore.getState();
    store.addSubjects(level.subjects);
    store.addSubjects(level.subjects); // même classe ré-activée
    store.addSubjects([{ ...level.subjects[0]!, weight: 9 }]); // doublon explicite
    const active = useAppStore
      .getState()
      .data.scenarios.find(
        s => s.id === useAppStore.getState().data.activeScenarioId
      )!;
    const names = active.subjects.map(s => s.name.toLowerCase());
    expect(active.subjects).toHaveLength(level.subjects.length);
    expect(new Set(names).size).toBe(names.length); // aucun doublon
  });
});
