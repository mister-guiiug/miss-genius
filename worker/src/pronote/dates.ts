// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

import type { Period } from './session.ts';

const DATE_COURTE = /^\d{2}\/\d{2}\/\d{4}$/;
const DATE_HEURE_LONGUE = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
const DATE_HEURE_COURTE = /^\d{2}\/\d{2}\/\d{2} \d{2}h\d{2}$/;
const SIECLE = new Date().getFullYear().toString().slice(0, 2);

/** Une date Pronote (`jj/mm/aaaa`, avec ou sans heure), en heure locale (`decodePronoteDate`). */
export function decodePronoteDate(texte: string): Date {
  if (DATE_COURTE.test(texte)) {
    const [jour, mois, annee] = texte.split('/').map(Number);
    return new Date(annee, mois - 1, jour);
  }
  if (DATE_HEURE_LONGUE.test(texte)) {
    const [date, heure] = texte.split(' ');
    const [jour, mois, annee] = date.split('/').map(Number);
    const [h, m, s] = heure.split(':').map(Number);
    return new Date(annee, mois - 1, jour, h, m, s);
  }
  if (DATE_HEURE_COURTE.test(texte)) {
    const [date, heure] = texte.split(' ');
    const [jour, mois, annee] = date.split('/').map(Number);
    const [h, m] = heure.split('h').map(Number);
    return new Date(
      parseInt(`${SIECLE}${String(annee).padStart(2, '0')}`),
      mois - 1,
      jour,
      h,
      m
    );
  }
  throw new Error(`Date Pronote illisible : ${texte}`);
}

export const decodePeriod = (p: any): Period => ({
  id: p.N,
  kind: p.G,
  name: p.L,
  startDate: decodePronoteDate(p.dateDebut.V),
  endDate: decodePronoteDate(p.dateFin.V),
});
