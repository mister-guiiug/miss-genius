import type { Subject, SubjectColor } from '../../shared/types/domain.ts';
import type { SubjectIconKey } from '../../shared/lib/subjectIcons.ts';

/** Une matière suggérée (sans id) : prête à être activée dans un scénario. */
export type SuggestedSubject = Omit<Subject, 'id'> & { icon: SubjectIconKey };

/** Une classe scolaire et son set de matières proposées. */
export interface ClassLevel {
  id: string;
  /** Libellé affiché (ex. « 6ᵉ »). */
  label: string;
  /** Regroupement pour le sélecteur (ex. « Collège »). */
  group: string;
  subjects: SuggestedSubject[];
}

/**
 * Matières canoniques réutilisées entre classes. Les coefficients par défaut
 * sont volontairement simples et **modifiables** par l'élève après activation
 * (le système français ne fixe pas de coefficients au collège ; au lycée ils
 * varient selon la voie — ce sont des points de départ raisonnables).
 */
const make = (
  name: string,
  icon: SubjectIconKey,
  color: SubjectColor,
  weight = 1
): SuggestedSubject => ({ name, icon, color, weight });

const FRANCAIS = (w = 1) => make('Français', 'language', 'rose', w);
const MATHS = (w = 1) => make('Mathématiques', 'calculator', 'violet', w);
const HIST_GEO = (w = 1) => make('Histoire-Géographie', 'globe', 'amber', w);
const ANGLAIS = (w = 1) => make('Anglais (LV1)', 'language', 'sky', w);
const LV2 = (w = 1) => make('LV2', 'language', 'coral', w);
const SVT = (w = 1) => make('SVT', 'biology', 'mint', w);
const PHYS_CHIM = (w = 1) => make('Physique-Chimie', 'chemistry', 'indigo', w);
const SCIENCES_TECH = (w = 1) =>
  make('Sciences et technologie', 'science', 'mint', w);
const TECHNO = (w = 1) => make('Technologie', 'tech', 'lime', w);
const EPS = (w = 1) => make('EPS', 'sport', 'coral', w);
const ARTS = (w = 1) => make('Arts plastiques', 'art', 'rose', w);
const MUSIQUE = (w = 1) => make('Éducation musicale', 'music', 'violet', w);
const EMC = (w = 1) => make('EMC', 'law', 'sky', w);
const SES = (w = 1) => make('SES', 'economics', 'mint', w);
const SNT = (w = 1) => make('SNT', 'computer', 'lime', w);
const ENS_SCI = (w = 1) =>
  make('Enseignement scientifique', 'science', 'mint', w);
const PHILO = (w = 1) => make('Philosophie', 'philosophy', 'indigo', w);
const SPE_MATHS = () =>
  make('Spécialité Mathématiques', 'calculator', 'violet', 4);
const SPE_PC = () =>
  make('Spécialité Physique-Chimie', 'chemistry', 'indigo', 4);
const SPE_SVT = () => make('Spécialité SVT', 'biology', 'mint', 4);
const SPE_SES = () => make('Spécialité SES', 'economics', 'mint', 4);
const SPE_NSI = () => make('Spécialité NSI', 'computer', 'lime', 4);
const SPE_HGGSP = () => make('Spécialité HGGSP', 'globe', 'amber', 4);
const SPE_HLP = () => make('Spécialité HLP', 'language', 'rose', 4);
const SPE_LLCE = () => make('Spécialité LLCER', 'language', 'sky', 4);

const college6 = [
  FRANCAIS(),
  MATHS(),
  HIST_GEO(),
  ANGLAIS(),
  SCIENCES_TECH(),
  EPS(),
  ARTS(),
  MUSIQUE(),
  EMC(),
];

const collegeCycle4 = [
  FRANCAIS(),
  MATHS(),
  HIST_GEO(),
  ANGLAIS(),
  LV2(),
  SVT(),
  PHYS_CHIM(),
  TECHNO(),
  EPS(),
  ARTS(),
  MUSIQUE(),
  EMC(),
];

const seconde = [
  FRANCAIS(),
  MATHS(),
  HIST_GEO(),
  ANGLAIS(),
  LV2(),
  SVT(),
  PHYS_CHIM(),
  SES(),
  SNT(),
  EPS(),
  EMC(),
];

const premiere = [
  FRANCAIS(2),
  HIST_GEO(),
  ANGLAIS(),
  LV2(),
  ENS_SCI(),
  EPS(),
  EMC(),
  SPE_MATHS(),
  SPE_PC(),
  SPE_SVT(),
  SPE_SES(),
  SPE_NSI(),
  SPE_HGGSP(),
  SPE_HLP(),
  SPE_LLCE(),
];

const terminale = [
  PHILO(),
  HIST_GEO(),
  ANGLAIS(),
  LV2(),
  ENS_SCI(),
  EPS(),
  EMC(),
  SPE_MATHS(),
  SPE_PC(),
  SPE_SVT(),
  SPE_SES(),
  SPE_NSI(),
  SPE_HGGSP(),
];

/** Catalogue ordonné (collège puis lycée). */
export const CLASS_LEVELS: ClassLevel[] = [
  { id: '6e', label: '6ᵉ', group: 'Collège', subjects: college6 },
  { id: '5e', label: '5ᵉ', group: 'Collège', subjects: collegeCycle4 },
  { id: '4e', label: '4ᵉ', group: 'Collège', subjects: collegeCycle4 },
  { id: '3e', label: '3ᵉ', group: 'Collège', subjects: collegeCycle4 },
  { id: '2nde', label: '2ᵈᵉ', group: 'Lycée', subjects: seconde },
  { id: '1re', label: '1ʳᵉ générale', group: 'Lycée', subjects: premiere },
  {
    id: 'terminale',
    label: 'Terminale générale',
    group: 'Lycée',
    subjects: terminale,
  },
];
