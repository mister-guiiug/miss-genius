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
 * Depuis la 3.22 du socle, la mécanique enveloppe versionnée + chaîne de
 * migrations + validation vient de `dev-wpa-config/versioned-store` — promue
 * depuis ce fichier même et son jumeau miss-uwh. Ce module reste la façade de
 * l'app : le contrat `loadData/saveData/clearData/exportData/importData` est
 * inchangé pour le store zustand et l'écran Réglages.
 *
 * COMPATIBILITÉ (trois invariants, prouvés par `storage.test.ts`) :
 *  1. **Données en place.** L'app écrivait la donnée NUE (version interne dans
 *     `data.version`) sous `miss-genius:data`. Le socle enveloppe (`{v, data}`)
 *     et considère toute valeur sans enveloppe comme v0 : chaque migration est
 *     donc GARDÉE par la version interne (migration de coquille) — une donnée
 *     déjà à jour traverse la chaîne sans transformation ni perte, une donnée
 *     v1 reçoit ses périodes comme avant.
 *  2. **Exports.** `exportData` continue de produire la donnée nue (avec son
 *     `version` interne) : l'ANCIENNE app sait importer les nouveaux fichiers,
 *     et `importData` accepte les fichiers nus déjà téléchargés (v1 ou v2)
 *     comme les enveloppes `{v, data}` du socle.
 *  3. **Contrat.** Mêmes cinq fonctions, mêmes signatures.
 *
 * Ce que la bascule AJOUTE : copie de côté (`miss-genius:data.backup-…`) avant
 * toute migration ou perte possible, migration persistée dès le chargement, et
 * jamais de destruction silencieuse (une version inconnue est mise de côté au
 * lieu d'être écrasée à la sauvegarde suivante).
 */
import { createVersionedStore } from '@mister-guiiug/dev-wpa-config/versioned-store';
import type { AppData } from '../types/domain.ts';
import { appDataSchema } from './schema.ts';
import { createId } from './id.ts';
import { createInitialData, SCHEMA_VERSION } from './seed.ts';

/**
 * 1 -> 2 : introduction des périodes. Les données existantes n'avaient pas de
 * notion de période : on crée une période « Année » par scénario et on y
 * rattache toutes les notes (migration non destructive, ordre préservé).
 */
function migrateScenarioToPeriods(sc: unknown): unknown {
  const s = sc as {
    periods?: unknown;
    grades?: unknown;
    activePeriodId?: string;
  };
  if (Array.isArray(s.periods) && s.periods.length > 0) return sc;
  const period = { id: createId('per'), name: 'Année' };
  const grades = Array.isArray(s.grades)
    ? s.grades.map(g =>
        g && typeof g === 'object' && 'periodId' in g
          ? g
          : { ...(g as object), periodId: period.id }
      )
    : s.grades;
  return {
    ...(sc as object),
    periods: [period],
    activePeriodId: period.id,
    grades,
  };
}

/** Version interne portée par la donnée elle-même (`data.version`). */
function innerVersion(data: unknown): number {
  const v = (data as { version?: unknown } | null)?.version;
  return typeof v === 'number' ? v : 0;
}

/**
 * Migrations indexées par version SOURCE (contrat du socle : chacune monte
 * d'un cran, c'est le magasin qui tient le compte).
 *
 * GARDE DE COQUILLE : les données historiques sont stockées nues — le socle
 * les voit TOUTES en v0, quelle que soit leur version interne. Chaque étape ne
 * transforme donc que si la version interne l'exige, et la maintient à jour :
 * le schéma zod l'exige, et c'est elle qui rend les anciens fichiers d'export
 * auto-descriptifs.
 */
const migrations: Record<number, (data: unknown) => unknown> = {
  // 0 -> 1 : schémas pré-versionnés -> pose la version interne.
  0: (data: unknown) =>
    innerVersion(data) >= 1 ? data : { ...(data as object), version: 1 },
  // 1 -> 2 : périodes (cf. migrateScenarioToPeriods).
  1: (data: unknown) => {
    if (innerVersion(data) >= 2) return data;
    const d = data as { scenarios?: unknown };
    const scenarios = Array.isArray(d.scenarios)
      ? d.scenarios.map(migrateScenarioToPeriods)
      : d.scenarios;
    return { ...(data as object), version: 2, scenarios };
  },
};

const store = createVersionedStore<AppData>({
  // Préfixe partagé avec `miss-genius:theme` (anti-FOUC dans index.html) ; la
  // clé composée reste la clé historique `miss-genius:data`.
  store: 'miss-genius:',
  key: 'data',
  version: SCHEMA_VERSION,
  migrations,
  // Validation injectée : le socle ne dépend pas de zod, l'app lui passe son
  // `schema.parse` (qui lève sur une donnée invalide).
  validate: data => appDataSchema.parse(data) as AppData,
  seed: createInitialData,
});

/** Lit l'état persisté, migré et validé. Retombe sur l'état initial si invalide. */
export function loadData(): AppData {
  return store.load();
}

export function saveData(data: AppData): void {
  if (!store.save(data)) {
    console.error('[miss-genius] écriture du stockage impossible');
  }
}

/** Efface l'instantané ET ses copies de côté ; `miss-genius:theme` survit. */
export function clearData(): void {
  store.clear();
}

/**
 * Sérialise pour export (téléchargement JSON). VOLONTAIREMENT la donnée nue,
 * pas l'enveloppe `{v, data}` du socle : le fichier reste importable par les
 * versions antérieures de l'app, et la version interne (`data.version`) suffit
 * à `importData` pour rejouer les migrations demain.
 */
export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Parse + migre + valide un JSON importé (fichier nu historique ou enveloppe
 * du socle). N'écrit que si tout a réussi ; lève une erreur lisible sinon.
 */
export function importData(json: string): AppData {
  return store.import(json);
}
