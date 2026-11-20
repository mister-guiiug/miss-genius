// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * Les notes d'une période (`gradesOverview`, `DernieresNotes`), réduites à ce
 * que lit le Worker : valeur, barème, coefficient, date, matière, commentaire.
 * Les moyennes et les pièces jointes de Pawnote ne sont pas reprises.
 */

import { decodePronoteDate } from './dates.ts';
import {
  apiProperties,
  requete,
  TabLocation,
  type Period,
  type SessionHandle,
} from './session.ts';

export const GradeKind = {
  Error: -1,
  Grade: 0,
  Absent: 1,
  Exempted: 2,
  NotGraded: 3,
  Unfit: 4,
  Unreturned: 5,
  AbsentZero: 6,
  UnreturnedZero: 7,
  Congratulations: 8,
} as const;
export type GradeKind = (typeof GradeKind)[keyof typeof GradeKind];

export interface GradeValue {
  kind: GradeKind;
  points: number;
}

export interface Grade {
  id: string;
  value: GradeValue;
  outOf: GradeValue;
  date: Date;
  subject: { id: string; name: string };
  coefficient: number;
  comment: string;
  isBonus: boolean;
  isOptional: boolean;
  isOutOf20: boolean;
}

/**
 * Une note Pronote : un nombre, ou une chaîne « 15,5 », ou « |1 » pour une
 * note non chiffrée (absent, dispensé…). Absent et non rendu « zéro » valent 0.
 */
export function decodeGradeValue(note: string | number): GradeValue {
  if (typeof note === 'number') return { kind: GradeKind.Grade, points: note };
  if (typeof note !== 'string') throw new Error('Note Pronote illisible.');
  const morceaux = note.split('|');
  const kind = (
    morceaux.length >= 2 ? parseInt(morceaux[1]) : GradeKind.Grade
  ) as GradeKind;
  let points = parseFloat(note.replace(',', '.'));
  if (kind === GradeKind.AbsentZero || kind === GradeKind.UnreturnedZero)
    points = 0;
  return { kind, points };
}

function decodeGrade(devoir: any): Grade {
  const bonus = Boolean(devoir.estBonus);
  return {
    id: devoir.N,
    value: decodeGradeValue(devoir.note.V),
    outOf: decodeGradeValue(devoir.bareme.V),
    date: decodePronoteDate(devoir.date.V),
    subject: { id: devoir.service.V.N, name: devoir.service.V.L },
    coefficient: devoir.coefficient,
    comment: devoir.commentaire ?? '',
    isBonus: bonus,
    isOptional: Boolean(devoir.estFacultatif) && !bonus,
    isOutOf20: Boolean(devoir.estRamenerSur20),
  };
}

/** Les notes de la période (`DernieresNotes`, onglet Notes). */
export async function gradesOverview(
  session: SessionHandle,
  period: Period
): Promise<{ grades: Grade[] }> {
  const proprietes = apiProperties(session.instance.version);
  const reponse = await requete(session, 'DernieresNotes', {
    [proprietes.signature]: { onglet: TabLocation.Grades },
    [proprietes.data]: {
      Periode: { N: period.id, G: period.kind, L: period.name },
    },
  });
  const donnees = reponse[proprietes.data];
  return { grades: (donnees.listeDevoirs?.V ?? []).map(decodeGrade) };
}
