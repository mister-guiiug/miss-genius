import type { SubjectColor } from '../types/domain.ts';

/** Couleur d'accent (hex) d'une matière. Renfort visuel, jamais seule porteuse. */
export const SUBJECT_HEX: Record<SubjectColor, string> = {
  violet: '#7c3aed',
  rose: '#e11d48',
  mint: '#10b981',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  coral: '#fb7185',
  indigo: '#4f46e5',
  lime: '#65a30d',
};

/** Seuils pédagogiques d'appréciation d'une moyenne (base 20). */
export function appreciation(avg: number | null): {
  label: string;
  tone: 'good' | 'mid' | 'low' | 'none';
} {
  if (avg === null) return { label: 'Pas encore de note', tone: 'none' };
  if (avg >= 14) return { label: 'Point fort', tone: 'good' };
  if (avg >= 10) return { label: 'En bonne voie', tone: 'mid' };
  return { label: 'À renforcer', tone: 'low' };
}
