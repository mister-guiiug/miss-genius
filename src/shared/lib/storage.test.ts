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
});
