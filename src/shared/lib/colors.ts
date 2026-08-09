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

/** Tonalité d'appréciation d'une matière (seuils pédagogiques, base 20). */
export type AppreciationTone = 'good' | 'mid' | 'low' | 'none';

/**
 * Seuils pédagogiques d'appréciation d'une moyenne (base 20). Renvoie une
 * *tonalité* sémantique ; le libellé affiché est résolu côté composant via i18n
 * (`dashboard.appreciation.<tone>`).
 */
export function appreciation(avg: number | null): { tone: AppreciationTone } {
  if (avg === null) return { tone: 'none' };
  if (avg >= 14) return { tone: 'good' };
  if (avg >= 10) return { tone: 'mid' };
  return { tone: 'low' };
}
