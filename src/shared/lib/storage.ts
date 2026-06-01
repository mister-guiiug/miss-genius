/**
 * Couche de persistance locale.
 *
 * Choix : **localStorage** plutôt qu'IndexedDB. Justification :
 *  - le volume de données est minuscule (quelques matières, notes, scénarios —
 *    typiquement < 100 Ko), bien en deçà du quota localStorage (~5 Mo) ;
 *  - l'accès synchrone garde le store simple (pas d'async dans les sélecteurs) ;
 *  - un *snapshot JSON unique* est l'unité naturelle pour l'export/import et pour
 *    une future synchronisation cloud (on pousse/tire un seul document).
 *
 * Évolution : passer à IndexedDB (via un wrapper Promises) le jour où l'on stocke
 * des historiques volumineux ou des pièces jointes. Le contrat
 * `load()/save()/exportData()/importData()` resterait identique.
 *
 * Robustesse : enveloppe versionnée + chaîne de migrations + validation zod.
 */
import type { AppData } from '../types/domain.ts';
import { appDataSchema } from './schema.ts';
import { createInitialData, SCHEMA_VERSION } from './seed.ts';

const STORAGE_KEY = 'miss-genius:data';

/** Migrations indexées par version *source*. Chacune monte d'un cran. */
const migrations: Record<number, (data: unknown) => unknown> = {
  // 0 -> 1 : exemple de squelette de migration pour les schémas pré-versionnés.
  0: (data: unknown) => ({ ...(data as object), version: 1 }),
  // Ajouter ici 1 -> 2, 2 -> 3, … au fil des évolutions de schéma.
};

function runMigrations(raw: unknown): unknown {
  let data = raw as { version?: number };
  let version = typeof data.version === 'number' ? data.version : 0;
  while (version < SCHEMA_VERSION && migrations[version]) {
    data = migrations[version](data) as { version?: number };
    version = typeof data.version === 'number' ? data.version : version + 1;
  }
  return data;
}

/** Lit l'état persisté, migré et validé. Retombe sur l'état initial si invalide. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialData();
    const migrated = runMigrations(JSON.parse(raw));
    const parsed = appDataSchema.safeParse(migrated);
    if (!parsed.success) {
      console.warn('[miss-genius] données invalides, réinitialisation', parsed.error);
      return createInitialData();
    }
    return parsed.data as AppData;
  } catch (err) {
    console.warn('[miss-genius] lecture du stockage impossible', err);
    return createInitialData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[miss-genius] écriture du stockage impossible', err);
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

/** Sérialise pour export (téléchargement JSON). */
export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** Parse + valide un JSON importé. Lève une erreur lisible si invalide. */
export function importData(json: string): AppData {
  const migrated = runMigrations(JSON.parse(json));
  const parsed = appDataSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new Error('Fichier invalide : le format ne correspond pas à Miss Genius.');
  }
  return parsed.data as AppData;
}
