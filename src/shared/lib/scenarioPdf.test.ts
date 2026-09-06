/**
 * Ce que ces tests éprouvent : le document reste LISIBLE.
 *
 * Le générateur du socle encode en WinAnsi et remplace ce qu'il ne sait pas
 * écrire par « ? ». Deux erreurs symétriques sont possibles, et invisibles à la
 * relecture : transcrire ce qu'il rend déjà très bien (l'apostrophe
 * typographique de tous les messages français deviendrait une apostrophe
 * droite), ou laisser passer ce qu'il ne rend pas (un émoji dans un nom de
 * matière deviendrait « ? »). Les deux sont figées ici.
 *
 * Les caractères sensibles sont écrits en `String.fromCodePoint` : invisibles
 * ou trop ressemblants dans une littérale, ils ne survivraient pas à une
 * relecture — ni à un éditeur qui normalise.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { messages } from '../../i18n/messages.ts';
import type { Scenario } from '../types/domain.ts';
import { DEFAULT_SETTINGS } from './seed.ts';
import type { ScenarioSummaryInput } from './scenarioSummary.ts';
import {
  renderScenarioPdf,
  scenarioPdfFilename,
  toPdfText,
} from './scenarioPdf.ts';

const MINUS = String.fromCodePoint(0x2212); // moins typographique
const NNBSP = String.fromCodePoint(0x202f); // espace fine insécable
const NBSP = String.fromCodePoint(0x00a0); // espace insécable
const BRAIN = String.fromCodePoint(0x1f9e0); // 🧠

function scenario(): Scenario {
  return {
    id: 'scn-1',
    name: 'Mon bulletin',
    subjects: [{ id: 'sub-m', name: 'Maths', weight: 4, color: 'violet' }],
    grades: [
      {
        id: 'g1',
        subjectId: 'sub-m',
        periodId: 'per-1',
        value: 15,
        max: 20,
        weight: 1,
      },
    ],
    periods: [{ id: 'per-1', name: 'Trimestre 1' }],
    activePeriodId: 'per-1',
    goal: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

const input: ScenarioSummaryInput = {
  scenario: scenario(),
  settings: DEFAULT_SETTINGS,
  t: createTranslator(messages, 'fr', 'fr'),
  locale: 'fr',
  localeTag: 'fr-FR',
};

describe('toPdfText', () => {
  it('laisse intacte la ponctuation typographique que CP1252 sait écrire', () => {
    // C'est toute la ponctuation des messages de l'app : la transcrire serait
    // dégrader le document sans aucune nécessité.
    expect(toPdfText('l’objectif — « Maths » : 13,5/20…')).toBe(
      'l’objectif — « Maths » : 13,5/20…'
    );
  });

  it('transcrit ce que CP1252 n’a pas', () => {
    expect(toPdfText(`${MINUS}1,2`)).toBe('-1,2');
    expect(toPdfText(`1${NNBSP}000 et 12${NBSP}h`)).toBe('1 000 et 12 h');
  });

  it('retire les émojis plutôt que de semer des « ? »', () => {
    expect(toPdfText(`Maths ${BRAIN}`)).toBe('Maths ');
    expect(toPdfText(BRAIN)).toBe('');
  });
});

describe('renderScenarioPdf', () => {
  it('produit un PDF d’une page qui porte le résumé en clair', () => {
    const text = new TextDecoder('latin1').decode(renderScenarioPdf(input));

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 1');
    expect(text).toContain('Mon bulletin');
    expect(text).toContain('Trimestre 1');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('pagine un bulletin trop long pour une page A4', () => {
    const many = scenario();
    many.subjects = Array.from({ length: 90 }, (_, i) => ({
      id: `sub-${i}`,
      name: `Matière ${i + 1}`,
      weight: 1,
      color: 'violet' as const,
    }));
    const text = new TextDecoder('latin1').decode(
      renderScenarioPdf({ ...input, scenario: many })
    );

    expect(text).toMatch(/\/Count [2-9]/);
  });
});

describe('scenarioPdfFilename', () => {
  it('nomme le fichier par le scénario et le jour', () => {
    expect(scenarioPdfFilename('Mon bulletin', new Date(2026, 8, 6))).toBe(
      'miss-genius-mon-bulletin-2026-09-06.pdf'
    );
  });

  it('retombe sur un nom valide quand le scénario n’en donne aucun', () => {
    expect(scenarioPdfFilename(BRAIN, new Date(2026, 8, 6))).toBe(
      'miss-genius-scenario-2026-09-06.pdf'
    );
  });
});
