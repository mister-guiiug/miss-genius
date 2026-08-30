import { beforeEach, describe, expect, it } from 'vitest';
import type { AppData } from '../types/domain.ts';
import { appDataSchema } from './schema.ts';
import { createInitialData } from './seed.ts';
import {
  clearData,
  exportData,
  importData,
  loadData,
  saveData,
} from './storage.ts';

beforeEach(() => {
  localStorage.clear();
});

const KEY = 'miss-genius:data';

/** Un état non trivial (matières + note) pour prouver l'absence de perte. */
function richData(): AppData {
  const data = createInitialData();
  const sc = data.scenarios[0]!;
  sc.name = 'Terminale';
  sc.subjects = [
    { id: 'sub_m', name: 'Maths', weight: 3, color: 'violet' },
    { id: 'sub_h', name: 'Histoire', weight: 2, color: 'amber' },
  ];
  sc.grades = [
    {
      id: 'grd_1',
      subjectId: 'sub_m',
      periodId: sc.periods[0]!.id,
      value: 15.5,
      max: 20,
      weight: 2,
      label: 'DS 1',
    },
  ];
  data.onboarded = true;
  return data;
}

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

/**
 * La bascule vers `dev-wpa-config/versioned-store` (3.22) change le format
 * d'enveloppe : l'app écrivait la donnée NUE (version interne `data.version`),
 * le socle écrit `{ v, data }`. Ces tests prouvent les trois compatibilités
 * non négociables : données en place, fichiers d'export déjà téléchargés,
 * exports encore lisibles par l'ancienne app.
 */
describe('compatibilité socle versioned-store (3.22)', () => {
  it('charge à l’identique l’ancienne enveloppe nue (v2 interne) déjà en place', () => {
    const legacy = richData();
    const raw = JSON.stringify(legacy); // format écrit par l'ancien saveData
    localStorage.setItem(KEY, raw);

    const data = loadData();
    expect(data).toEqual(legacy); // aucune perte, aucune transformation

    // La coquille a basculé vers l'enveloppe du socle, même clé…
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored.v).toBe(2);
    expect(stored.data).toEqual(legacy);
    // …avec copie de côté de l'original AVANT migration, et un second
    // chargement stable (la migration de coquille ne tourne qu'une fois).
    expect(localStorage.getItem(`${KEY}.backup-v0`)).toBe(raw);
    expect(loadData()).toEqual(legacy);
  });

  it('migre des données pré-versionnées (sans champ `version`)', () => {
    const legacy = JSON.parse(JSON.stringify(richData())) as Record<
      string,
      unknown
    >;
    delete legacy['version'];
    localStorage.setItem(KEY, JSON.stringify(legacy));

    const data = loadData();
    expect(data.version).toBe(2);
    expect(data.scenarios[0]!.name).toBe('Terminale');
    expect(data.scenarios[0]!.grades).toHaveLength(1);
  });

  it('importe un ancien fichier d’export (nu, v2) sans perte', () => {
    const legacy = richData();
    // Fichier téléchargé par l'ancien SettingsScreen : donnée nue indentée.
    const oldFile = JSON.stringify(legacy, null, 2);
    expect(importData(oldFile)).toEqual(legacy);
  });

  it('importe un très ancien fichier d’export (nu, v1 sans périodes)', () => {
    const oldFile = JSON.stringify(
      {
        version: 1,
        scenarios: [
          {
            id: 'old',
            name: 'Ancien bulletin',
            subjects: [{ id: 'm', name: 'Maths', weight: 1, color: 'violet' }],
            grades: [
              { id: 'g1', subjectId: 'm', value: 14, max: 20, weight: 1 },
            ],
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
      },
      null,
      2
    );

    const data = importData(oldFile);
    const sc = data.scenarios[0]!;
    expect(sc.name).toBe('Ancien bulletin');
    expect(sc.periods).toHaveLength(1);
    expect(sc.grades[0]!.periodId).toBe(sc.periods[0]!.id);
  });

  it('importe aussi une enveloppe du socle ({ v, data })', () => {
    const data = richData();
    expect(importData(JSON.stringify({ v: 2, data }))).toEqual(data);
  });

  it('exporte la donnée nue, encore importable par l’ancienne app', () => {
    const data = richData();
    const parsed = JSON.parse(exportData(data));
    // Pas d'enveloppe { v, data } : l'ancien importData faisait
    // `runMigrations(JSON.parse(json))` (no-op en v2) puis `safeParse`.
    expect(parsed.v).toBeUndefined();
    expect(parsed.version).toBe(2);
    expect(appDataSchema.safeParse(parsed).success).toBe(true);
    expect(parsed).toEqual(JSON.parse(JSON.stringify(data)));
  });

  it('met de côté une version d’enveloppe inconnue au lieu de l’écraser', () => {
    const fromFuture = JSON.stringify({ v: 99, data: { hello: true } });
    localStorage.setItem(KEY, fromFuture);

    const data = loadData();
    expect(data.scenarios).toHaveLength(1); // repli sur le seed
    expect(localStorage.getItem(KEY)).toBe(fromFuture); // clé principale intacte
    expect(localStorage.getItem(`${KEY}.backup-v99`)).toBe(fromFuture);
    // …et l'import du même fichier se REFUSE avec un message lisible.
    expect(() => importData(fromFuture)).toThrow(/version 99/);
  });

  it('clearData efface l’instantané et ses copies, pas le thème', () => {
    saveData(richData());
    loadData();
    localStorage.setItem(`${KEY}.backup-v0`, '{}');
    localStorage.setItem('miss-genius:theme', 'dark');

    clearData();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(`${KEY}.backup-v0`)).toBeNull();
    expect(localStorage.getItem('miss-genius:theme')).toBe('dark');
  });
});
