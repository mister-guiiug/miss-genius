/**
 * Ce que ces tests éprouvent : le TEXTE qui sort de l'app.
 *
 * Le résumé est la seule chose que verra le parent ou le professeur à qui on
 * le montre — il n'aura ni l'écran, ni le simulateur, ni la possibilité de
 * demander « et ça, ça veut dire quoi ? ». Les assertions portent donc sur les
 * phrases exactes, pas sur des nombres bruts : une moyenne, un objectif et la
 * note nécessaire, écrits dans la langue et avec le séparateur décimal de la
 * personne qui partage.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { messages, type Locale } from '../../i18n/messages.ts';
import type { Grade, Scenario, Settings, Subject } from '../types/domain.ts';
import { DEFAULT_SETTINGS } from './seed.ts';
import {
  buildScenarioShareTitle,
  buildScenarioSummaryText,
  type ScenarioSummaryInput,
  type Translate,
} from './scenarioSummary.ts';

// Sans arguments de type explicites : `Messages` porte les littérales du
// catalogue FR, et `Record<Locale, Messages>` refuserait alors le catalogue EN
// (« Save » n'est pas « Enregistrer »). L'inférence, elle, retient l'union —
// c'est ce que fait `createI18n` dans l'app.
const translate = (locale: Locale): Translate =>
  createTranslator(messages, locale, 'fr');

const MATHS: Subject = {
  id: 'sub-m',
  name: 'Maths',
  weight: 4,
  color: 'violet',
};
const HISTOIRE: Subject = {
  id: 'sub-h',
  name: 'Histoire',
  weight: 2,
  color: 'amber',
};

function grade(subjectId: string, value: number, id: string): Grade {
  return { id, subjectId, periodId: 'per-1', value, max: 20, weight: 1 };
}

/**
 * Maths : 15 et 12 → 13,5 (coef 4). Histoire : 12 (coef 2).
 * Moyenne générale = (13,5 × 4 + 12 × 2) / 6 = 13 exactement.
 */
function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'scn-1',
    name: 'Mon bulletin',
    subjects: [MATHS, HISTOIRE],
    grades: [
      grade('sub-m', 15, 'g1'),
      grade('sub-m', 12, 'g2'),
      grade('sub-h', 12, 'g3'),
      // Note d'une AUTRE période : elle ne doit peser sur rien.
      { ...grade('sub-m', 3, 'g4'), periodId: 'per-2' },
    ],
    periods: [
      { id: 'per-1', name: 'Trimestre 1' },
      { id: 'per-2', name: 'Trimestre 2' },
    ],
    activePeriodId: 'per-1',
    goal: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function input(
  over: Partial<ScenarioSummaryInput> & { settings?: Settings } = {}
): ScenarioSummaryInput {
  return {
    scenario: scenario(),
    settings: DEFAULT_SETTINGS,
    t: translate('fr'),
    locale: 'fr',
    localeTag: 'fr-FR',
    ...over,
  };
}

/**
 * Objectif « 15/20 en Maths », prochaine évaluation de coefficient 2.
 * S = 15 + 12 = 27, W = 2, w = 2 → x = (15 × 4 − 27) / 2 = 16,5.
 */
const MATHS_GOAL = {
  id: 'goal-1',
  scope: { kind: 'subject' as const, subjectId: 'sub-m' },
  target: 15,
  nextWeight: 2,
};

describe('buildScenarioSummaryText', () => {
  it('porte la moyenne générale, les matières et le compte de notes', () => {
    const text = buildScenarioSummaryText(input());

    expect(text).toContain('Miss Genius — Mon bulletin');
    expect(text).toContain('Trimestre 1');
    expect(text).toContain('Moyenne générale : 13/20');
    expect(text).toContain('- Maths (coef 4) : 13,5/20 — 2 notes');
    expect(text).toContain('- Histoire (coef 2) : 12/20 — 1 note');
  });

  it('porte l’objectif ET la note nécessaire au prochain contrôle', () => {
    const text = buildScenarioSummaryText(
      input({ scenario: scenario({ goal: MATHS_GOAL }) })
    );

    expect(text).toContain('Atteindre 15/20 en Maths.');
    expect(text).toContain('Note nécessaire en Maths : 16,5/20 (coef 2).');
  });

  it('suit la langue : séparateur décimal et phrases anglaises', () => {
    const text = buildScenarioSummaryText(
      input({
        scenario: scenario({ goal: MATHS_GOAL }),
        t: translate('en'),
        locale: 'en',
        localeTag: 'en-GB',
      })
    );

    expect(text).toContain('Overall average: 13/20');
    expect(text).toContain('- Maths (weight 4): 13.5/20 — 2 grades');
    expect(text).toContain('Grade needed in Maths: 16.5/20 (weight 2).');
  });

  it('applique l’arrondi d’affichage aux moyennes, jamais à la note nécessaire', () => {
    // L'écran Objectif rend la note nécessaire brute (deux décimales) : le
    // résumé doit dire le même nombre, sinon il annonce une note atteignable
    // qui ne l'est pas — ou l'inverse.
    const text = buildScenarioSummaryText(
      input({
        scenario: scenario({ goal: MATHS_GOAL }),
        settings: {
          ...DEFAULT_SETTINGS,
          rounding: { mode: 'floor', decimals: 0 },
        },
      })
    );

    expect(text).toContain('- Maths (coef 4) : 13/20');
    expect(text).toContain('Note nécessaire en Maths : 16,5/20 (coef 2).');
  });

  it('dit qu’un objectif est déjà tenu plutôt que d’annoncer 0', () => {
    const text = buildScenarioSummaryText(
      input({
        scenario: scenario({ goal: { ...MATHS_GOAL, target: 5 } }),
      })
    );

    expect(text).toContain('Objectif déjà atteint');
    expect(text).not.toContain('Note nécessaire');
  });

  it('dit qu’un objectif est hors d’atteinte en une évaluation', () => {
    const text = buildScenarioSummaryText(
      input({
        scenario: scenario({
          goal: { ...MATHS_GOAL, target: 20, nextWeight: 1 },
        }),
      })
    );

    expect(text).toContain('hors d’atteinte en une seule évaluation (Maths)');
  });

  it('dit l’absence d’objectif au lieu de laisser un blanc', () => {
    expect(buildScenarioSummaryText(input())).toContain(
      'Aucun objectif fixé pour l’instant.'
    );
  });

  it('n’écrit le pied qu’avec une adresse, et y met celle qu’on lui donne', () => {
    expect(buildScenarioSummaryText(input())).not.toContain('Simulé avec');
    expect(
      buildScenarioSummaryText(
        input({ appUrl: 'https://mister-guiiug.github.io/miss-genius/' })
      )
    ).toContain(
      'Simulé avec Miss Genius — https://mister-guiiug.github.io/miss-genius/'
    );
  });

  it('résume un objectif de moyenne générale sur la première matière, nommée', () => {
    const text = buildScenarioSummaryText(
      input({
        scenario: scenario({
          goal: {
            id: 'goal-2',
            scope: { kind: 'general' },
            target: 14,
            nextWeight: 1,
          },
        }),
      })
    );

    expect(text).toContain('Atteindre 14/20 de moyenne générale.');
    // La matière n'est pas persistée dans l'objectif : le résumé dit laquelle
    // il a retenue, pour que la note annoncée reste interprétable.
    expect(text).toMatch(/Note nécessaire en Maths : [\d,]+\/20 \(coef 1\)\./);
  });
});

describe('buildScenarioShareTitle', () => {
  it('nomme l’app et le scénario, pour la feuille de partage du système', () => {
    expect(buildScenarioShareTitle(scenario(), translate('fr'))).toBe(
      'Miss Genius — Mon bulletin'
    );
  });
});
