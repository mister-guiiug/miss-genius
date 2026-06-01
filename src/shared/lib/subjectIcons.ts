import {
  Atom,
  BookOpen,
  Calculator,
  Cog,
  Drama,
  Dumbbell,
  FlaskConical,
  Globe,
  GraduationCap,
  Languages,
  Landmark,
  Laptop,
  Leaf,
  LineChart,
  Microscope,
  Music,
  Palette,
  PenTool,
  Scale,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icônes de matière = composants Lucide (plus d'emoji). La valeur stockée dans
 * `Subject.icon` est une **clé** de cette table ; toute valeur inconnue (anciennes
 * données emoji incluses) retombe sur `book`.
 */
export const SUBJECT_ICON_MAP = {
  book: BookOpen,
  language: Languages,
  calculator: Calculator,
  globe: Globe,
  history: Landmark,
  biology: Leaf,
  science: Microscope,
  chemistry: FlaskConical,
  physics: Atom,
  tech: Cog,
  sport: Dumbbell,
  art: Palette,
  drama: Drama,
  music: Music,
  economics: LineChart,
  computer: Laptop,
  law: Scale,
  philosophy: PenTool,
  graduation: GraduationCap,
} satisfies Record<string, LucideIcon>;

export type SubjectIconKey = keyof typeof SUBJECT_ICON_MAP;

/** Clés proposées dans le sélecteur d'icône (ordre d'affichage). */
export const SUBJECT_ICON_KEYS = Object.keys(
  SUBJECT_ICON_MAP
) as SubjectIconKey[];

export const DEFAULT_SUBJECT_ICON: SubjectIconKey = 'book';

/** Résout une clé (ou valeur héritée invalide) vers un composant Lucide. */
export function resolveSubjectIcon(icon: string | undefined): LucideIcon {
  return (
    SUBJECT_ICON_MAP[icon as SubjectIconKey] ??
    SUBJECT_ICON_MAP[DEFAULT_SUBJECT_ICON]
  );
}
