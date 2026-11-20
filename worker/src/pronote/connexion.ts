// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * La connexion à Pronote par identifiant et mot de passe, et sa reprise par
 * jeton quand Pronote demande de personnaliser la sécurité du compte.
 * Correspond à `loginCredentials`, `loginToken`, `instanceParameters`,
 * `identify`, `authenticate` et `userParameters` de Pawnote.
 */

import {
  aesChiffre,
  aesDechiffre,
  rsaChiffre,
  sha256HexMajuscule,
} from './chiffrement.ts';
import { decodePeriod } from './dates.ts';
import {
  AccessDeniedError,
  AccountDisabledError,
  AuthenticateError,
  BadCredentialsError,
  SecurityError,
} from './erreurs.ts';
import {
  brut,
  concat,
  deUtf8,
  deUtf8Souple,
  utf8,
  versBase64,
} from './octets.ts';
import {
  AccountKind,
  apiProperties,
  cleanURL,
  requete,
  sessionInformation,
  type InstanceParameters,
  type Period,
  type SessionHandle,
  type Tab,
  type UserResource,
} from './session.ts';

/** Paramètres de la page mobile : `fd` contourne le filtre de navigateur, `login` le CAS. */
const BASE_PARAMS = { fd: 1, login: true };

/** Contourne la délégation d'authentification, pour une connexion par mot de passe. */
const BYPASS_DELEGATION = 'A6ABB224-12DD-4E31-AD3E-8A39A1C2C335';

export interface PasswordAuthenticationParams {
  url: string;
  kind: AccountKind;
  username: string;
  password: string;
  deviceUUID: string;
  navigatorIdentifier?: string | null;
}

export interface TokenAuthenticationParams {
  url: string;
  kind: AccountKind;
  username: string;
  token: string;
  deviceUUID: string;
  navigatorIdentifier?: string | null;
}

export interface RefreshInformation {
  token: string;
  username: string;
  kind: AccountKind;
  url: string;
  navigatorIdentifier: string | null;
}

/** `FonctionParametres` : la session envoie son vecteur AES, le serveur ses paramètres. */
export async function instanceParameters(
  session: SessionHandle,
  navigatorIdentifier: string | null = null
): Promise<InstanceParameters> {
  const info = session.information;
  const uuid = info.rsaFromConstants
    ? versBase64(
        info.http
          ? rsaChiffre(info.aesIV, info.rsaModulus, info.rsaExponent)
          : info.aesIV,
        64
      )
    : versBase64(rsaChiffre(info.aesIV, info.rsaModulus, info.rsaExponent));

  const data = { identifiantNav: navigatorIdentifier, Uuid: uuid };
  // La version n'est pas encore sûre : les données partent sous les deux noms.
  const reponse = await requete(session, 'FonctionParametres', {
    data,
    donnees: data,
  });
  const parametres = reponse.data || reponse.donnees;

  return {
    version: parametres.General.versionPN.split('.').map(Number),
    navigatorIdentifier: parametres.identifiantNav ?? null,
    periods: (parametres.General.ListePeriodes ?? []).map(decodePeriod),
  };
}

/** `Identification` : le serveur répond l'aléa et le défi à résoudre. */
async function identify(
  session: SessionHandle,
  p: {
    username: string;
    deviceUUID: string;
    requestFirstMobileAuthentication: boolean;
    reuseMobileAuthentication: boolean;
  }
): Promise<any> {
  const proprietes = apiProperties(session.instance.version);
  const reponse = await requete(session, 'Identification', {
    [proprietes.data]: {
      genreConnexion: 0,
      genreEspace: session.information.accountKind,
      identifiant: p.username,
      pourENT: false,
      enConnexionAuto: false,
      demandeConnexionAuto: false,
      enConnexionAppliMobile: p.reuseMobileAuthentication,
      demandeConnexionAppliMobile: p.requestFirstMobileAuthentication,
      demandeConnexionAppliMobileJeton: false,
      uuidAppliMobile: p.deviceUUID,
      loginTokenSAV: '',
      // Cohérent avec l'en-tête User-Agent.
      informationsAppareil: { modele: 'iPhone18,3', platforme: 'iOS' },
    },
  });
  return reponse[proprietes.data];
}

/** `Authentification` : la solution du défi ; les refus d'accès deviennent des erreurs. */
async function authenticate(
  session: SessionHandle,
  challenge: string
): Promise<any> {
  const proprietes = apiProperties(session.instance.version);
  const reponse = await requete(session, 'Authentification', {
    [proprietes.data]: {
      connexion: 0,
      challenge,
      espace: session.information.accountKind,
    },
  });
  const data = reponse[proprietes.data];

  if (typeof data.Acces === 'number' && data.Acces !== 0) {
    switch (data.Acces) {
      case 1:
        throw new BadCredentialsError();
      case 2:
      case 3:
      case 4:
      case 5:
      case 7:
      case 8:
        throw new AccessDeniedError();
      case 6:
      case 10:
        throw new AccountDisabledError();
      case 9:
        if (data.AccesMessage) {
          const message = data.AccesMessage.message ?? '(sans message)';
          throw new AuthenticateError(
            data.AccesMessage.titre
              ? `${data.AccesMessage.titre} : ${message}`
              : message
          );
        }
    }
  }
  return data;
}

/** La clé intermédiaire : identifiant + SHA-256(aléa + mot de passe ou jeton), en majuscules. */
async function cleIntermediaire(
  identity: any,
  identifiant: string,
  secret: string
): Promise<Uint8Array> {
  const empreinte = await sha256HexMajuscule(
    concat(brut(identity.alea ?? ''), utf8(secret))
  );
  return brut(identifiant + empreinte);
}

/** Les modes de compatibilité : identifiant et secret en minuscules si le serveur le demande. */
function compatibilite(identity: any, identifiant: string, secret: string) {
  return {
    identifiant:
      identity.modeCompLog === 1 ? identifiant.toLowerCase() : identifiant,
    secret: identity.modeCompMdp === 1 ? secret.toLowerCase() : secret,
  };
}

/** Le défi : déchiffré, un caractère sur deux retiré, chiffré de nouveau. */
async function resousDefi(
  session: SessionHandle,
  identity: any,
  cle: Uint8Array
): Promise<string> {
  const vecteur = session.information.aesIV;
  try {
    const texte = deUtf8(await aesDechiffre(identity.challenge, cle, vecteur));
    let solution = '';
    for (let i = 0; i < texte.length; i += 2) solution += texte.charAt(i);
    return await aesChiffre(utf8(solution), cle, vecteur);
  } catch {
    throw new BadCredentialsError();
  }
}

/** La clé de session définitive, que le serveur envoie chiffrée (« 12,34,… »). */
async function cleAuthentifiee(
  session: SessionHandle,
  authentication: any,
  cle: Uint8Array
): Promise<void> {
  const texte = deUtf8Souple(
    await aesDechiffre(authentication.cle, cle, session.information.aesIV)
  );
  session.information.aesKey = Uint8Array.from(
    texte.split(',').map(c => parseInt(c) & 0xff)
  );
}

/** `ParametresUtilisateur` : les ressources du compte et leurs onglets. */
async function userParameters(session: SessionHandle): Promise<UserResource[]> {
  const parametres = (await requete(session, 'ParametresUtilisateur', {}))[
    apiProperties(session.instance.version).data
  ];
  const ressources: any[] =
    session.information.accountKind === AccountKind.PARENT
      ? parametres.ressource.listeRessources
      : [parametres.ressource];
  return ressources.map(r => decodeUserResource(r, session.instance.periods));
}

function decodeTab(onglet: any, periodes: Period[]): Tab {
  const trouve = (id: string) => periodes.find(p => p.id === id);
  return {
    location: onglet.G,
    defaultPeriod: onglet.periodeParDefaut
      ? trouve(onglet.periodeParDefaut.V.N)
      : undefined,
    periods: (onglet.listePeriodes?.V ?? [])
      .map((p: any) => trouve(p.N))
      .filter(Boolean),
  };
}

function decodeUserResource(ressource: any, periodes: Period[]): UserResource {
  const tabs = new Map<number, Tab>();
  for (const onglet of ressource.listeOngletsPourPeriodes?.V ?? [])
    tabs.set(onglet.G, decodeTab(onglet, periodes));
  return {
    id: ressource.N,
    kind: ressource.G,
    name: ressource.L,
    establishmentName: ressource.Etablissement?.V?.L,
    className: ressource.classeDEleve?.L,
    tabs,
  };
}

async function termine(
  session: SessionHandle,
  authentication: any,
  identity: any,
  identifiant: string
): Promise<RefreshInformation> {
  session.resources = await userParameters(session);
  session.userResource = session.resources[0];
  return {
    token: authentication.jetonConnexionAppliMobile,
    username: identity.login ?? identifiant,
    kind: session.information.accountKind,
    url: session.information.url,
    navigatorIdentifier: session.instance.navigatorIdentifier,
  };
}

/** Le début commun : page mobile, paramètres d'instance, identification. */
async function ouvre(
  session: SessionHandle,
  auth: {
    url: string;
    kind: AccountKind;
    username: string;
    deviceUUID: string;
    navigatorIdentifier?: string | null;
  },
  parJeton: boolean
): Promise<any> {
  const { information, version } = await sessionInformation(
    {
      base: cleanURL(auth.url),
      kind: auth.kind,
      cookies: parJeton ? ['appliMobile=1'] : [],
      params: parJeton
        ? BASE_PARAMS
        : { ...BASE_PARAMS, bydlg: BYPASS_DELEGATION },
    },
    session.fetcher
  );
  session.information = information;
  session.instance = { version, navigatorIdentifier: null, periods: [] };
  session.instance = await instanceParameters(
    session,
    auth.navigatorIdentifier ?? null
  );

  return identify(session, {
    username: auth.username,
    deviceUUID: auth.deviceUUID,
    requestFirstMobileAuthentication: !parJeton,
    reuseMobileAuthentication: parJeton,
  });
}

/** Connexion par identifiant et mot de passe (`loginCredentials`). */
export async function loginCredentials(
  session: SessionHandle,
  auth: PasswordAuthenticationParams
): Promise<RefreshInformation> {
  const identity = await ouvre(session, auth, false);
  const { identifiant, secret } = compatibilite(
    identity,
    auth.username,
    auth.password
  );
  const cle = await cleIntermediaire(identity, identifiant, secret);
  const authentication = await authenticate(
    session,
    await resousDefi(session, identity, cle)
  );
  await cleAuthentifiee(session, authentication, cle);

  // Pronote demande de personnaliser la sécurité : on reprend par le jeton
  // d'application mobile qu'il vient de délivrer, comme Pawnote.
  if (authentication.actionsDoubleAuth) {
    return loginToken(session, {
      url: session.information.url,
      kind: session.information.accountKind,
      username: identity.login ?? identifiant,
      token: authentication.jetonConnexionAppliMobile,
      deviceUUID: auth.deviceUUID,
      navigatorIdentifier: session.instance.navigatorIdentifier,
    });
  }
  return termine(session, authentication, identity, identifiant);
}

/** Connexion par jeton d'application mobile (`loginToken`). */
export async function loginToken(
  session: SessionHandle,
  auth: TokenAuthenticationParams
): Promise<RefreshInformation> {
  const identity = await ouvre(session, auth, true);
  const { identifiant, secret } = compatibilite(
    identity,
    auth.username,
    auth.token
  );
  const cle = await cleIntermediaire(identity, identifiant, secret);
  const authentication = await authenticate(
    session,
    await resousDefi(session, identity, cle)
  );
  await cleAuthentifiee(session, authentication, cle);

  if (authentication.actionsDoubleAuth) throw new SecurityError();
  return termine(session, authentication, identity, identifiant);
}
