import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lazy, type ComponentType } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { Shell } from './App.tsx';

/**
 * LE DÉFAUT QUE CES TESTS VERROUILLENT : un clic sans aucun effet visible.
 *
 * Diagnostiqué sur miss-badminton le 20/09/2026 (PR #80), puis retrouvé sur
 * onze dépôts du parc. Mesuré à froid sur deux sites publiés, première visite,
 * service worker pas encore installé : 133 ms d'écran figé sur mister-settle,
 * 161 ms sur mister-molkky, pendant lesquelles l'URL indiquait déjà la nouvelle
 * route et l'écran affichait encore l'ancien.
 *
 * La cause n'est pas une lenteur anormale : react-router 7 enveloppe tout
 * changement d'URL dans `startTransition`, et React 19 garde alors
 * délibérément l'écran déjà affiché plutôt que de montrer le repli de
 * `Suspense`. Le repli existait bien, dans `Shell` — il n'a simplement jamais
 * pu paraître sur un clic.
 *
 * Ces tests tiennent donc le CONTRAT, pas la mise en forme : tant que l'écran
 * n'est pas là, l'entrée cliquée se dit occupée et la barre reste à l'écran
 * pour le montrer.
 */

/** Monte la coquille face à un écran dont on décide nous-même de l'arrivée. */
function monterFaceAUnEcranLent() {
  let resous!: () => void;
  const EcranLent = lazy(
    () =>
      new Promise<{ default: ComponentType }>(resolve => {
        resous = () => resolve({ default: () => <h1>Mes matières</h1> });
      })
  );

  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<h1>Tableau de bord</h1>} />
            <Route path="subjects" element={<EcranLent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

  return {
    // Une expression régulière, pas une chaîne : le socle ajoute « (page
    // active) » au nom accessible de l'entrée courante.
    entree: (nom: RegExp) => screen.getByRole('link', { name: nom }),
    livreLEcran: async () => {
      await act(async () => {
        resous();
      });
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  // Force la locale FR (jsdom rapporte `navigator.language = en-US`).
  localStorage.setItem('genius_locale', 'fr');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("le clic sur une entrée du menu répond avant que l'écran soit là", () => {
  it("dit l'entrée occupée tant que le morceau n'est pas arrivé", async () => {
    const { entree, livreLEcran } = monterFaceAUnEcranLent();

    fireEvent.click(entree(/Matières/));

    expect(entree(/Matières/)).toHaveAttribute('aria-busy', 'true');
    // Les autres entrées ne se disent pas occupées : c'est celle qu'on a
    // cliquée qui travaille, pas la barre entière.
    expect(entree(/Objectif/)).not.toHaveAttribute('aria-busy');

    await livreLEcran();

    expect(
      screen.getByRole('heading', { name: 'Mes matières' })
    ).toBeInTheDocument();
    expect(entree(/Matières/)).not.toHaveAttribute('aria-busy');
  });

  it('annonce le chargement dans une zone vive, hors des liens', async () => {
    const { entree, livreLEcran } = monterFaceAUnEcranLent();

    expect(screen.getByRole('status')).toHaveTextContent('');
    fireEvent.click(entree(/Matières/));

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');

    await livreLEcran();

    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it("garde l'écran précédent ET la barre pendant l'attente", async () => {
    const { entree, livreLEcran } = monterFaceAUnEcranLent();

    fireEvent.click(entree(/Matières/));

    // CE QUE LE REPLI DE `Suspense` NE FERA PAS. React 19 garde l'écran déjà
    // affiché pendant la transition : le tableau de bord est toujours là, et
    // le repli de route n'a pas paru. C'est exactement pourquoi la barre doit
    // parler — elle seule le peut.
    expect(
      screen.getByRole('heading', { name: 'Tableau de bord' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Chargement…', { selector: 'p' })).toBeNull();

    // Et la barre reste sous les yeux pour le montrer : ce qui dit « je
    // charge » doit survivre au clic.
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(entree(/Matières/)).toHaveAttribute('aria-busy', 'true');

    await livreLEcran();

    expect(
      screen.queryByRole('heading', { name: 'Tableau de bord' })
    ).toBeNull();
  });

  it('laisse le navigateur faire quand le clic porte un modificateur', () => {
    const { entree } = monterFaceAUnEcranLent();

    fireEvent.click(entree(/Matières/), { ctrlKey: true });

    // Ouvrir dans un nouvel onglet n'est pas une navigation de cette page :
    // rien ne doit être mis en attente ici.
    expect(entree(/Matières/)).not.toHaveAttribute('aria-busy');
    expect(
      screen.getByRole('heading', { name: 'Tableau de bord' })
    ).toBeInTheDocument();
  });
});
