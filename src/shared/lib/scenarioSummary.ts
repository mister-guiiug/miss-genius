/**
 * Le résumé d'un scénario, en texte — ce qu'on montre à un parent ou à un
 * professeur.
 *
 * POURQUOI UNE FONCTION PURE À PART. Le résumé sort par trois portes (le
 * partage natif, le presse-papiers, le PDF) et doit dire exactement la même
 * chose par les trois. Il est donc construit UNE fois, ligne à ligne, sans
 * React ni DOM — et c'est cette construction que les tests éprouvent.
 *
 * POURQUOI IL REPREND LE CALCUL DE L'ÉCRAN OBJECTIF. « Quelle note me
 * faut-il ? » est le cœur de l'app : un résumé qui l'omettrait obligerait à
 * tendre le téléphone, c'est-à-dire à ne rien résoudre. Les deux appels
 * (`requiredSubjectAverageForGeneral` puis `requiredGradeForSubjectAverage`)
 * sont ceux de `GoalScreen`, dans le même ordre et sur la même période.
 *
 * LES DEUX APPROXIMATIONS ASSUMÉES, et pourquoi elles sont sans risque :
 *
 *  1. **Le barème de la prochaine évaluation.** `Goal` ne le persiste pas —
 *     l'écran Objectif le tient dans un état local, initialisé à la base de
 *     référence. Le résumé reprend ce même défaut (`settings.referenceBase`)
 *     et écrit la note obtenue SUR ce barème (« 18,5/20 »), donc lisible sans
 *     ambiguïté.
 *  2. **La matière de la prochaine évaluation, pour un objectif GÉNÉRAL.**
 *     Elle n'est pas persistée non plus ; l'écran Objectif propose la première
 *     matière du scénario. Le résumé fait pareil, et NOMME toujours la matière
 *     dans la phrase : le lecteur voit sur quoi porte la note annoncée.
 */

import type { I18nPaths } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { formatNumber } from '@mister-guiiug/dev-pwa-config/format';
import type { Locale, Messages } from '../../i18n/messages.ts';
import { plural } from '../../i18n';
import type { Grade, Scenario, Settings } from '../types/domain.ts';
import { computeSubjectResults, generalAverage } from './average.ts';
import {
  requiredGradeForSubjectAverage,
  requiredSubjectAverageForGeneral,
  type RequiredReason,
} from './simulate.ts';
import { formatAverage } from './format.ts';

/**
 * Le traducteur de l'app, décrit STRUCTURELLEMENT plutôt qu'importé de
 * `useI18n` : ce module ne doit pas dépendre de React pour être testable nu.
 */
export type Translate = (
  path: I18nPaths<Messages>,
  params?: Record<string, string | number>
) => string;

export interface ScenarioSummaryInput {
  /** Le scénario résumé — sa période ACTIVE, comme partout ailleurs. */
  scenario: Scenario;
  settings: Settings;
  t: Translate;
  locale: Locale;
  /**
   * Étiquette BCP-47 passée aux formateurs `Intl` (`localeTag` de `useI18n`).
   * Explicite, et non le défaut de module posé par `createI18n` : un résumé
   * doit se formater pareil qu'il vienne d'un écran, d'un test ou d'un PDF.
   */
  localeTag: string;
  /** URL canonique de l'app, en pied de résumé. Omise, aucun pied n'est écrit. */
  appUrl?: string;
}

/**
 * Note nécessaire à la prochaine évaluation pour tenir l'objectif du scénario.
 * `null` en l'absence d'objectif : le résumé le dit alors en toutes lettres.
 */
interface RequiredGrade {
  /** Matière sur laquelle la note porte (celle que la phrase nomme). */
  subjectName: string;
  /** Note nécessaire, bornée au barème ; `null` si elle n'a pas de sens. */
  grade: number | null;
  nextMax: number;
  nextWeight: number;
  reason: RequiredReason;
}

function computeRequiredGrade(
  scenario: Scenario,
  settings: Settings,
  periodGrades: Grade[]
): RequiredGrade | null {
  const goal = scenario.goal;
  if (!goal) return null;

  const options = {
    referenceBase: settings.referenceBase,
    normalizeBases: settings.normalizeBases,
  };
  // Cf. l'en-tête : `Goal` ne porte pas de barème, la base de référence est le
  // défaut de l'écran Objectif.
  const nextMax = settings.referenceBase;
  const nextWeight = goal.nextWeight > 0 ? goal.nextWeight : 1;

  // Copie locale : la portée est une union discriminée, et l'affinage se perd
  // dès qu'on la relit dans une fermeture (`Array.prototype.find`).
  const scope = goal.scope;
  const evalSubject =
    scope.kind === 'subject'
      ? scenario.subjects.find(s => s.id === scope.subjectId)
      : scenario.subjects[0];
  const subjectName = evalSubject?.name ?? '';

  if (!evalSubject) {
    return {
      subjectName,
      grade: null,
      nextMax,
      nextWeight,
      reason: 'invalid-input',
    };
  }

  // Objectif de moyenne générale : on remonte d'abord à la moyenne de matière
  // qu'il faudrait, puis à la note qui l'amène — les deux étapes de l'écran.
  let targetForSubject = goal.target;
  if (scope.kind === 'general') {
    const viaGeneral = requiredSubjectAverageForGeneral(
      scenario.subjects,
      periodGrades,
      evalSubject.id,
      goal.target,
      options
    );
    if (viaGeneral.reason !== 'ok' || viaGeneral.requiredAverage === null) {
      return {
        subjectName,
        grade: null,
        nextMax,
        nextWeight,
        reason: viaGeneral.reason,
      };
    }
    targetForSubject = viaGeneral.requiredAverage;
  }

  const result = requiredGradeForSubjectAverage(
    periodGrades.filter(g => g.subjectId === evalSubject.id),
    targetForSubject,
    nextWeight,
    nextMax,
    options
  );
  return {
    subjectName,
    grade: result.reason === 'ok' ? result.clamped : null,
    nextMax,
    nextWeight,
    reason: result.reason,
  };
}

/**
 * Le résumé, ligne à ligne (une ligne vide sépare deux sections).
 *
 * `scenarioPdf.ts` met en gras toute ligne finissant par « : » — les
 * traductions des têtes de section doivent garder ce deux-points.
 */
export function buildScenarioSummaryLines(
  input: ScenarioSummaryInput
): string[] {
  const { scenario, settings, t, locale, localeTag, appUrl } = input;
  const base = settings.referenceBase;
  const options = {
    referenceBase: base,
    normalizeBases: settings.normalizeBases,
  };

  const periodGrades = scenario.grades.filter(
    g => g.periodId === scenario.activePeriodId
  );
  const results = computeSubjectResults(
    scenario.subjects,
    periodGrades,
    options
  );
  const general = generalAverage(results);
  const period = scenario.periods.find(p => p.id === scenario.activePeriodId);

  /** Une moyenne, arrondie comme l'utilisateur l'a réglé, sur sa base. */
  const average = (value: number | null) =>
    formatAverage(value, settings.rounding, base, localeTag);
  /** Un coefficient : jamais écrit à la main, la virgule suit la langue. */
  const weight = (value: number) =>
    t('common.weightShort', {
      weight: formatNumber(value, localeTag, { maximumFractionDigits: 2 }),
    });

  const lines: string[] = [];
  lines.push(t('share.title', { name: scenario.name }));
  lines.push(period?.name ?? t('share.allPeriods'));
  lines.push(t('share.overall', { average: average(general) }));
  lines.push('');

  lines.push(t('share.subjectsHeading'));
  for (const r of results) {
    lines.push(
      t('share.subjectLine', {
        name: r.subject.name,
        weight: weight(r.subject.weight),
        average: average(r.average),
        count: t(`common.gradeCount.${plural(locale, r.gradeCount)}`, {
          count: r.gradeCount,
        }),
      })
    );
  }
  lines.push('');

  lines.push(t('share.goalHeading'));
  const required = computeRequiredGrade(scenario, settings, periodGrades);
  const goal = scenario.goal;
  if (!goal || !required) {
    lines.push(t('share.noGoal'));
  } else {
    const scope = goal.scope;
    const goalSubjectId = scope.kind === 'subject' ? scope.subjectId : null;
    lines.push(
      goalSubjectId === null
        ? t('share.goalGeneral', { target: average(goal.target) })
        : t('share.goalSubject', {
            target: average(goal.target),
            subject:
              scenario.subjects.find(s => s.id === goalSubjectId)?.name ?? '',
          })
    );
    if (required.reason === 'ok' && required.grade !== null) {
      lines.push(
        t('share.required', {
          subject: required.subjectName,
          // La note nécessaire n'est PAS soumise à l'arrondi d'affichage des
          // moyennes — l'écran Objectif la rend brute à deux décimales près, et
          // le résumé doit dire le même nombre.
          grade: formatAverage(
            required.grade,
            { mode: 'none', decimals: 2 },
            required.nextMax,
            localeTag
          ),
          weight: weight(required.nextWeight),
        })
      );
    } else if (required.reason === 'already-reached') {
      lines.push(t('share.requiredReached'));
    } else if (required.reason === 'impossible-too-high') {
      lines.push(
        t('share.requiredImpossible', { subject: required.subjectName })
      );
    } else {
      lines.push(t('share.requiredInvalid'));
    }
  }

  if (appUrl) {
    lines.push('');
    lines.push(t('share.footer', { url: appUrl }));
  }

  return lines;
}

/** Le résumé en un seul texte — ce que reçoivent le partage et la copie. */
export function buildScenarioSummaryText(input: ScenarioSummaryInput): string {
  return buildScenarioSummaryLines(input).join('\n');
}

/**
 * Titre du partage natif. Séparé du corps : `shareOrCopy` le passe à la feuille
 * système, qui l'affiche à part.
 */
export function buildScenarioShareTitle(
  scenario: Scenario,
  t: Translate
): string {
  return t('share.title', { name: scenario.name });
}
