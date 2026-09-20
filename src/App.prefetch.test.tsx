import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { Shell } from './App.tsx';

/**
 * LE CONTRAT QUE CES TESTS VERROUILLENT : les écrans du menu se téléchargent
 * PENDANT L'INACTIVITÉ — pas au montage, et pas au clic, où l'attente se paie
 * au pire moment (133 ms d'écran figé mesurés sur mister-settle le 20/09/2026,
 * première visite). Et rien du tout quand le visiteur a demandé d'épargner son
 * forfait.
 *
 * Le préchargement lui-même est celui du socle (`useIdlePrefetch`), éprouvé
 * là-bas — une seule fois par chargeur, rejets avalés, repli sans
 * `requestIdleCallback`. Ce qui se joue ici est le BRANCHEMENT : les quatre
 * écrans du menu passent par lui, et eux seuls.
 */

/**
 * LES ÉCRANS SONT DOUBLÉS, ET C'EST LEUR FABRIQUE QUI TÉMOIGNE : Vitest ne
 * l'appelle qu'au premier `import()` du module — exactement le moment où le
 * morceau est demandé. Le registre ne la rejoue jamais dans un même fichier :
 * les tests s'enchaînent donc du plus restrictif (rien ne doit partir) au plus
 * large, sinon « rien ne part » serait vrai à vide.
 */
const demandes = vi.hoisted(() => ({ ecrans: [] as string[] }));

vi.mock('./features/subjects/SubjectsScreen.tsx', () => {
  demandes.ecrans.push('subjects');
  return { SubjectsScreen: () => null };
});
vi.mock('./features/scenarios/ScenariosScreen.tsx', () => {
  demandes.ecrans.push('scenarios');
  return { ScenariosScreen: () => null };
});
vi.mock('./features/goals/GoalScreen.tsx', () => {
  demandes.ecrans.push('goal');
  return { GoalScreen: () => null };
});
vi.mock('./features/settings/SettingsScreen.tsx', () => {
  demandes.ecrans.push('settings');
  return { SettingsScreen: () => null };
});
// Pas une entrée du menu : on y arrive depuis la liste des matières.
vi.mock('./features/grades/SubjectDetailScreen.tsx', () => {
  demandes.ecrans.push('subject-detail');
  return { SubjectDetailScreen: () => null };
});

/**
 * jsdom n'a pas `requestIdleCallback` : on le pose, et on garde la main sur le
 * moment où « le navigateur souffle ».
 */
function tenirLeRepos() {
  const rappels: IdleRequestCallback[] = [];
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn((rappel: IdleRequestCallback) => rappels.push(rappel))
  );
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  return {
    rappels,
    souffle: () => {
      for (const rappel of rappels) {
        rappel({ didTimeout: false, timeRemaining: () => 50 });
      }
    },
  };
}

/** Le visiteur a demandé d'épargner son forfait ; rend le geste qui l'annule. */
function epargnerLeForfait() {
  Object.defineProperty(navigator, 'connection', {
    value: { saveData: true },
    configurable: true,
  });
  return () => {
    delete (navigator as { connection?: unknown }).connection;
  };
}

/** Le temps que d'éventuels `import()` se règlent — pour prouver un « rien ». */
const laisserPasser = () => new Promise(resolve => setTimeout(resolve, 30));

function monter() {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<h1>Tableau de bord</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('les écrans du menu arrivent pendant le repos, avant le clic', () => {
  /*
   * EN PREMIER, et ce n'est pas un détail : passé après le test suivant, les
   * modules seraient déjà en registre et « rien ne part » serait vrai à vide.
   */
  it('ne demande rien quand le visiteur épargne son forfait, même au repos', async () => {
    const rendreLeForfait = epargnerLeForfait();
    try {
      const { souffle } = tenirLeRepos();
      monter();

      souffle();
      await laisserPasser();

      expect(demandes.ecrans).toEqual([]);
    } finally {
      rendreLeForfait();
    }
  });

  it('demande les quatre écrans du menu au repos — pas au montage, et eux seuls', async () => {
    const { rappels, souffle } = tenirLeRepos();
    monter();

    // Monté : la demande de repos est posée, rien n'est encore parti.
    expect(rappels).toHaveLength(1);
    expect(demandes.ecrans).toEqual([]);

    souffle();

    await waitFor(() =>
      expect([...demandes.ecrans].sort()).toEqual([
        'goal',
        'scenarios',
        'settings',
        'subjects',
      ])
    );
    // Le détail d'une matière attend le clic : il n'est pas sous le pouce.
    expect(demandes.ecrans).not.toContain('subject-detail');
  });
});
