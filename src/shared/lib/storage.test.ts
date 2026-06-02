import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialData } from './seed.ts';
import { exportData, importData, loadData, saveData } from './storage.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('persistance', () => {
  it('retourne des données initiales valides quand le stockage est vide', () => {
    const data = loadData();
    expect(data.scenarios).toHaveLength(1);
    expect(data.activeScenarioId).toBe(data.scenarios[0]!.id);
    expect(data.onboarded).toBe(false);
  });

  it('persiste puis relit fidèlement', () => {
    const data = createInitialData();
    data.scenarios[0]!.name = 'Trimestre 1';
    saveData(data);
    expect(loadData().scenarios[0]!.name).toBe('Trimestre 1');
  });

  it('réinitialise si le contenu stocké est corrompu', () => {
    localStorage.setItem('miss-genius:data', '{"version":1,"oops":true}');
    const data = loadData();
    expect(data.scenarios).toHaveLength(1); // fallback propre
  });

  it('exporte puis ré-importe un snapshot identique', () => {
    const data = createInitialData();
    const json = exportData(data);
    const reimported = importData(json);
    expect(reimported.activeScenarioId).toBe(data.activeScenarioId);
  });

  it('rejette un JSON importé invalide', () => {
    expect(() => importData('{"foo":1}')).toThrow();
  });

  it('migre des données v1 (sans périodes) vers v2 sans perte', () => {
    const legacy = {
      version: 1,
      scenarios: [
        {
          id: 'old',
          name: 'Ancien bulletin',
          subjects: [{ id: 'm', name: 'Maths', weight: 1, color: 'violet' }],
          grades: [{ id: 'g1', subjectId: 'm', value: 14, max: 20, weight: 1 }],
          goal: null,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      activeScenarioId: 'old',
      settings: {
        referenceBase: 20,
        rounding: { mode: 'nearest', decimals: 2 },
        normalizeBases: true,
        theme: 'light',
      },
      onboarded: true,
    };
    localStorage.setItem('miss-genius:data', JSON.stringify(legacy));

    const data = loadData();
    const sc = data.scenarios[0]!;
    expect(data.version).toBe(2);
    expect(sc.name).toBe('Ancien bulletin'); // préservé
    expect(sc.periods).toHaveLength(1);
    expect(sc.activePeriodId).toBe(sc.periods[0]!.id);
    // chaque note hérite de la période créée
    expect(sc.grades[0]!.periodId).toBe(sc.periods[0]!.id);
  });

  it('migre des données héritées sans `lockSubjectOrder` (pas de reset)', () => {
    const legacy = createInitialData();
    legacy.scenarios[0]!.name = 'Bulletin existant';
    // Simule une sauvegarde d'avant l'ajout du champ.
    const raw = JSON.parse(JSON.stringify(legacy));
    delete raw.settings.lockSubjectOrder;
    localStorage.setItem('miss-genius:data', JSON.stringify(raw));

    const data = loadData();
    expect(data.scenarios[0]!.name).toBe('Bulletin existant'); // données préservées
    expect(data.settings.lockSubjectOrder).toBe(true); // défaut « verrouillé »
  });
});
