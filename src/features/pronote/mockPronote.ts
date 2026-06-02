import type { PronoteResponse } from './pronoteContract.ts';

/**
 * Jeu de données de démonstration (même format que le proxy) : permet d'essayer
 * l'import sans connecteur configuré ni identifiants réels.
 */
export const MOCK_PRONOTE_RESPONSE: PronoteResponse = {
  ok: true,
  period: 'Démo · Trimestre 1',
  grades: [
    {
      subject: 'Mathématiques',
      value: 15,
      max: 20,
      coefficient: 2,
      date: '2026-09-12',
      label: 'Contrôle fonctions',
    },
    {
      subject: 'Mathématiques',
      value: 12.5,
      max: 20,
      coefficient: 1,
      date: '2026-09-28',
      label: 'Interro dérivées',
    },
    {
      subject: 'Histoire-Géographie',
      value: 13,
      max: 20,
      coefficient: 1,
      date: '2026-09-20',
    },
    {
      subject: 'Anglais (LV1)',
      value: 16,
      max: 20,
      coefficient: 1,
      date: '2026-10-02',
      label: 'Oral',
    },
    {
      subject: 'Physique-Chimie',
      value: 9,
      max: 20,
      coefficient: 2,
      date: '2026-10-05',
      label: 'TP',
    },
    { subject: 'EPS', value: 17, max: 20, coefficient: 1, date: '2026-10-09' },
  ],
};
