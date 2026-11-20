// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * Client Pronote du Worker : le sous-ensemble de Pawnote 1.6.2 qu'il utilise
 * (connexion élève par mot de passe, reprise par jeton, onglet Notes, notes
 * d'une période), sans `node-forge`, `pako` ni `@literate.ink/utilities`.
 * Mêmes noms que Pawnote, pour qu'un correctif amont se reporte facilement.
 */

export {
  AccountKind,
  TabLocation,
  createSessionHandle,
  type Period,
  type SessionHandle,
} from './session.ts';
export { loginCredentials, loginToken } from './connexion.ts';
export { GradeKind, gradesOverview, type Grade } from './notes.ts';
export * from './erreurs.ts';
