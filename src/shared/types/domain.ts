/**
 * Types métier de Miss Genius.
 *
 * Modèle retenu : chaque {@link Scenario} est un *snapshot complet et autonome*
 * (ses propres matières + notes). Dupliquer un scénario = copier ce snapshot,
 * ce qui permet de faire diverger des hypothèses sans contaminer la base.
 */

/** Types d'évaluation (facultatif sur une note). */
export const GRADE_TYPES = [
  'controle',
  'devoir-maison',
  'oral',
  'examen',
  'autre',
] as const;

export type GradeType = (typeof GRADE_TYPES)[number];

/** Ordre d'affichage des notes dans une matière. */
export const GRADE_SORTS = [
  'date-desc', // date, plus récente d'abord (défaut)
  'date-asc', // date, plus ancienne d'abord
  'added', // ordre de saisie
  'value-desc', // meilleure note d'abord
] as const;

export type GradeSort = (typeof GRADE_SORTS)[number];

/** Mode d'arrondi appliqué à l'affichage des moyennes. */
export type RoundingMode = 'none' | 'nearest' | 'floor' | 'ceil';

export interface RoundingConfig {
  mode: RoundingMode;
  /** Nombre de décimales conservées (0–3). */
  decimals: number;
}

/** Une période scolaire (trimestre, semestre, ou « Année »). */
export interface Period {
  id: string;
  name: string;
}

/** Une note saisie dans une matière. */
export interface Grade {
  id: string;
  subjectId: string;
  /** Période à laquelle la note est rattachée. */
  periodId: string;
  /** Note obtenue, exprimée sur {@link Grade.max}. */
  value: number;
  /** Barème de la note (ex. 20). Permet les notes sur bases différentes. */
  max: number;
  /** Coefficient de la note au sein de la matière (> 0). */
  weight: number;
  /** ISO date (YYYY-MM-DD), facultative. */
  date?: string;
  type?: GradeType;
  label?: string;
}

/** Une matière, avec son coefficient dans la moyenne générale. */
export interface Subject {
  id: string;
  name: string;
  /** Coefficient de la matière dans la moyenne générale (> 0). */
  weight: number;
  /** Couleur d'accent (token sémantique, ex. "violet"). */
  color: SubjectColor;
  /** Emoji facultatif (renfort non-couleur de l'identité visuelle). */
  icon?: string;
}

export const SUBJECT_COLORS = [
  'violet',
  'rose',
  'mint',
  'amber',
  'sky',
  'coral',
  'indigo',
  'lime',
] as const;

export type SubjectColor = (typeof SUBJECT_COLORS)[number];

/** Portée d'un objectif : moyenne générale ou une matière précise. */
export type GoalScope =
  | { kind: 'general' }
  | { kind: 'subject'; subjectId: string };

export interface Goal {
  id: string;
  scope: GoalScope;
  /** Moyenne cible, exprimée sur la base de référence (cf. settings). */
  target: number;
  /** Coefficient de la prochaine évaluation envisagée pour atteindre la cible. */
  nextWeight: number;
}

/** Un scénario = un univers complet de matières + notes + périodes + objectif. */
export interface Scenario {
  id: string;
  name: string;
  subjects: Subject[];
  grades: Grade[];
  /** Périodes du scénario (au moins une). */
  periods: Period[];
  /** Période actuellement affichée. */
  activePeriodId: string;
  goal: Goal | null;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  /** Base de référence des moyennes affichées (typiquement 20). */
  referenceBase: number;
  rounding: RoundingConfig;
  /** Normaliser automatiquement les notes saisies sur d'autres bases. */
  normalizeBases: boolean;
  theme: 'light' | 'dark';
  /**
   * Verrouille l'ordre des matières (true par défaut) : empêche le
   * glisser-déposer pour éviter un réordonnancement accidentel.
   */
  lockSubjectOrder: boolean;
  /** Ordre d'affichage des notes (défaut : date décroissante). */
  gradeSort: GradeSort;
}

/** État persisté complet (enveloppe versionnée). */
export interface AppData {
  version: number;
  scenarios: Scenario[];
  activeScenarioId: string;
  settings: Settings;
  onboarded: boolean;
}
