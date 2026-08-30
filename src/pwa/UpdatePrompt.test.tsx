import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * CE QUE CES TESTS VERROUILLENT : que le bandeau PEUT s'afficher.
 *
 * `UpdatePromptBanner` ne s'affiche que si on lui injecte le `registerSW` de
 * `virtual:pwa-register`. Oublier cette prop ne casse ni la compilation, ni le
 * typage, ni le rendu : le bandeau reste simplement muet, pour toujours — un
 * piège dans lequel une app de la famille est déjà tombée. Le mock par défaut
 * du socle (`vitest-setup`) rend un `registerSW` qui n'appelle jamais
 * `onNeedRefresh` : il ne prouverait rien. On le remplace par un mock qui
 * CAPTURE les rappels, afin de déclencher les deux annonces du service worker
 * et de vérifier ce qui s'affiche.
 *
 * UNE FONCTION `registerSW` NEUVE PAR TEST. Le hook du socle mémorise sa
 * connexion PAR RÉFÉRENCE de fonction (WeakMap) : réutiliser le même mock
 * ferait fuir `needRefresh` d'un test au suivant. D'où `vi.resetModules()` +
 * `vi.doMock`, qui refabriquent le module virtuel — et donc la fonction — à
 * chaque montage.
 */
async function mountPrompt() {
  vi.resetModules();
  // jsdom annonce `en-US` : sans épinglage, les libellés basculeraient en
  // anglais selon la machine.
  localStorage.setItem('genius_locale', 'fr');

  let onNeedRefresh: (() => void) | undefined;
  let onOfflineReady: (() => void) | undefined;
  let registrations = 0;

  vi.doMock('virtual:pwa-register', () => ({
    registerSW: (options?: {
      onNeedRefresh?: () => void;
      onOfflineReady?: () => void;
    }) => {
      registrations += 1;
      onNeedRefresh = options?.onNeedRefresh;
      onOfflineReady = options?.onOfflineReady;
      return () => Promise.resolve();
    },
  }));

  const { UpdatePrompt } = await import('./UpdatePrompt');
  const { I18nProvider } = await import('../i18n');

  render(
    <I18nProvider>
      <UpdatePrompt />
    </I18nProvider>
  );

  return {
    /** Le bandeau ET le message hors ligne partagent-ils un enregistrement ? */
    get registrations() {
      return registrations;
    },
    announceUpdate() {
      expect(onNeedRefresh).toBeTypeOf('function');
      act(() => onNeedRefresh?.());
    },
    announceOfflineReady() {
      expect(onOfflineReady).toBeTypeOf('function');
      act(() => onOfflineReady?.());
    },
  };
}

afterEach(() => {
  vi.doUnmock('virtual:pwa-register');
});

describe('UpdatePrompt', () => {
  it('n’annonce rien tant que le service worker se tait', async () => {
    const prompt = await mountPrompt();

    // Deux `useUpdatePrompt` sont montés (le bandeau + le message hors ligne)
    // mais le hook mémorise la connexion par référence de fonction : un seul
    // enregistrement, donc un seul jeu d'écouteurs.
    expect(prompt.registrations).toBe(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('affiche le bandeau quand une nouvelle version est disponible', async () => {
    const prompt = await mountPrompt();

    prompt.announceUpdate();

    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('data-dwc', 'update-banner');
    expect(banner).toHaveTextContent(
      'Une nouvelle version de Miss Genius est prête.'
    );
    expect(
      screen.getByRole('button', { name: 'Mettre à jour' })
    ).toBeInTheDocument();
  });

  it('« Plus tard » masque le bandeau pour la session', async () => {
    const prompt = await mountPrompt();
    prompt.announceUpdate();

    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('garde le message « prêt hors ligne », que le socle ne rend pas', async () => {
    const prompt = await mountPrompt();

    prompt.announceOfflineReady();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Miss Genius fonctionne maintenant hors ligne.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('la mise à jour prime sur le message hors ligne', async () => {
    const prompt = await mountPrompt();

    prompt.announceOfflineReady();
    prompt.announceUpdate();

    // Une seule carte, comme avant : celle qui bascule vers l'info utile.
    const cards = screen.getAllByRole('status');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('data-dwc', 'update-banner');
  });
});
