// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * Les erreurs de Pawnote que le Worker peut rencontrer, avec leurs noms
 * d'origine. Les messages sont en français : le Worker les renvoie tels quels
 * à l'application, qui les affiche.
 */

const erreur = (nom: string, message: string) =>
  class extends Error {
    constructor(detail?: string) {
      super(detail ?? message);
      this.name = nom;
    }
  };

export const BadCredentialsError = erreur(
  'BadCredentialsError',
  'Identifiant ou mot de passe incorrect.'
);
export const AccessDeniedError = erreur(
  'AccessDeniedError',
  'Accès refusé à cet espace Pronote.'
);
export const AccountDisabledError = erreur(
  'AccountDisabledError',
  'Ce compte Pronote est désactivé.'
);
export const AuthenticateError = erreur(
  'AuthenticateError',
  'Connexion refusée par Pronote.'
);
export const SecurityError = erreur(
  'SecurityError',
  'Pronote demande de personnaliser la sécurité du compte (double authentification) : le faire une fois dans l’application Pronote, puis réessayer.'
);
export const SuspendedIPError = erreur(
  'SuspendedIPError',
  'Pronote a provisoirement suspendu cette adresse IP.'
);
export const SessionExpiredError = erreur(
  'SessionExpiredError',
  'La session Pronote a expiré.'
);
export const PageUnavailableError = erreur(
  'PageUnavailableError',
  'Page Pronote introuvable : vérifier l’adresse de l’établissement.'
);
export const BusyPageError = erreur(
  'BusyPageError',
  'Pronote est momentanément indisponible.'
);
export const RateLimitedError = erreur(
  'RateLimitedError',
  'Trop de requêtes : Pronote limite le débit, réessayer plus tard.'
);
export const ServerSideError = erreur(
  'ServerSideError',
  'Erreur côté serveur Pronote.'
);
