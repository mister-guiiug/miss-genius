/**
 * Partage d'un scénario — le geste que l'app remplace : tendre le téléphone.
 *
 * CE QUE CE TEST PROUVE, et pourquoi il ne se contente pas de cliquer. Un
 * bouton qui ouvre la feuille de partage du système ne dit rien de ce qu'il y
 * met. `navigator.share` est donc remplacé par un double qui MÉMORISE sa
 * charge : les assertions portent sur le texte réellement transmis — la
 * moyenne, l'objectif, la note nécessaire — et sur l'absence d'`url`, qui
 * ferait perdre tout le résumé au profit d'un lien lors du repli
 * presse-papiers (`shareOrCopy` ne copie QUE l'url quand elle est fournie).
 *
 * Les données sont semées dans `localStorage` avant le premier script de la
 * page : sans elles l'app affiche son onboarding, et il n'y a rien à partager.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

/**
 * Maths : 15 et 12 → 13,5 (coef 4). Histoire : 12 (coef 2).
 * Moyenne générale = (13,5 × 4 + 12 × 2) / 6 = 13.
 * Objectif « 15/20 en Maths », prochaine éval. de coef 2 → 16,5/20.
 */
const SEED = {
  version: 2,
  activeScenarioId: 'scn-e2e',
  onboarded: true,
  settings: {
    referenceBase: 20,
    rounding: { mode: 'nearest', decimals: 2 },
    normalizeBases: true,
    theme: 'light',
    lockSubjectOrder: true,
    gradeSort: 'date-desc',
  },
  scenarios: [
    {
      id: 'scn-e2e',
      name: 'Bulletin e2e',
      subjects: [
        { id: 'sub-m', name: 'Maths', weight: 4, color: 'violet' },
        { id: 'sub-h', name: 'Histoire', weight: 2, color: 'amber' },
      ],
      grades: [
        {
          id: 'g1',
          subjectId: 'sub-m',
          periodId: 'per-1',
          value: 15,
          max: 20,
          weight: 1,
        },
        {
          id: 'g2',
          subjectId: 'sub-m',
          periodId: 'per-1',
          value: 12,
          max: 20,
          weight: 1,
        },
        {
          id: 'g3',
          subjectId: 'sub-h',
          periodId: 'per-1',
          value: 12,
          max: 20,
          weight: 1,
        },
      ],
      periods: [{ id: 'per-1', name: 'Trimestre 1' }],
      activePeriodId: 'per-1',
      goal: {
        id: 'goal-1',
        scope: { kind: 'subject', subjectId: 'sub-m' },
        target: 15,
        nextWeight: 2,
      },
      createdAt: 0,
      updatedAt: 0,
    },
  ],
};

/**
 * Sème l'état et installe le double de partage. `mode: 'share'` éprouve le
 * partage natif, `mode: 'clipboard'` le repli des navigateurs qui n'en ont pas.
 */
async function prepare(page: Page, mode: 'share' | 'clipboard') {
  await page.addInitScript(
    ({ seed, useShare }) => {
      localStorage.setItem(
        'miss-genius:data',
        JSON.stringify({ v: 2, data: seed })
      );
      // La langue est lue dans localStorage avant `navigator.language` : sans
      // elle, la locale du navigateur déciderait du séparateur décimal.
      localStorage.setItem('genius_locale', 'fr');

      const captured: unknown[] = [];
      (window as unknown as { __captured: unknown[] }).__captured = captured;

      Object.defineProperty(Navigator.prototype, 'share', {
        configurable: true,
        writable: true,
        value: useShare
          ? (data: unknown) => {
              captured.push(data);
              return Promise.resolve();
            }
          : undefined,
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            captured.push(text);
            return Promise.resolve();
          },
        },
      });
    },
    { seed: SEED, useShare: mode === 'share' }
  );
  await page.goto('/');
}

function shareButton(page: Page) {
  return page.getByRole('button', {
    name: 'Partager le scénario Bulletin e2e',
  });
}

async function captured(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __captured: unknown[] }).__captured
  );
}

test.describe('@critical partage d’un scénario', () => {
  test('transmet un résumé lisible au partage natif', async ({ page }) => {
    await prepare(page, 'share');

    // Le tableau de bord est chargé quand la moyenne générale est affichée.
    await expect(page.getByText('13/20').first()).toBeVisible();
    await shareButton(page).click();

    await expect
      .poll(async () => (await captured(page)).length)
      .toBeGreaterThan(0);
    const [payload] = (await captured(page)) as Array<{
      title?: string;
      text?: string;
      url?: string;
    }>;

    expect(payload?.title).toBe('Miss Genius — Bulletin e2e');
    expect(payload?.text).toContain('Moyenne générale : 13/20');
    expect(payload?.text).toContain('- Maths (coef 4) : 13,5/20 — 2 notes');
    expect(payload?.text).toContain('Atteindre 15/20 en Maths.');
    expect(payload?.text).toContain(
      'Note nécessaire en Maths : 16,5/20 (coef 2).'
    );
    // Cf. l'en-tête : l'adresse vit DANS le résumé, jamais en champ `url`.
    expect(payload?.url).toBeUndefined();
    expect(payload?.text).toContain('Simulé avec Miss Genius');
  });

  test('copie le même résumé et le dit, sans partage natif', async ({
    page,
  }) => {
    await prepare(page, 'clipboard');

    await expect(page.getByText('13/20').first()).toBeVisible();
    await shareButton(page).click();

    // Filtré : le pied de page du socle porte lui aussi une région `status`
    // (la version de l'app). Ce qui est éprouvé ici, c'est que la copie est
    // ANNONCÉE, pas seulement affichée.
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Résumé copié dans le presse-papiers.' })
    ).toBeVisible();
    const [text] = (await captured(page)) as string[];
    expect(text).toContain('Note nécessaire en Maths : 16,5/20 (coef 2).');

    // Le message est la SEULE trace de la copie : illisible, le repli n'a rien
    // annoncé. Le premier jet le peignait en `--mg-good`, jeton prévu pour les
    // pastilles teintées — 2,35:1 sur le fond de l'app, refusé par axe. Scan
    // borné à la région d'état : le tableau de bord porte par ailleurs des
    // violations antérieures à ce chantier (les pastilles, justement), qu'un
    // scan de page entière ferait échouer ici sans rapport avec le partage.
    // `include` sur un sélecteur qui ne matche rien lève : ce scan ne peut pas
    // passer à vide. Le pied de page du socle porte lui aussi un `status`,
    // d'où le `main` en tête — il est rendu HORS des routes (`App.tsx`).
    await expectNoA11yViolations(page, AxeBuilder, expect, {
      include: 'main p[role="status"]',
    });
  });
});
