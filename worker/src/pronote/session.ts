// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * La session Pronote et l'échange avec le serveur : page d'accueil mobile,
 * numéro d'ordre chiffré, données compressées puis chiffrées, réponse
 * déchiffrée puis décompressée. Correspond à `session-information`,
 * `api-properties`, `versions`, `keys`, `RequestFN` et `ResponseFN` de Pawnote.
 */

import {
  aesChiffre,
  aesDechiffre,
  compresse,
  decompresse,
} from './chiffrement.ts';
import { aleatoire, deHex, deUtf8Souple, utf8, versHex } from './octets.ts';
import {
  AccessDeniedError,
  BusyPageError,
  PageUnavailableError,
  RateLimitedError,
  ServerSideError,
  SessionExpiredError,
  SuspendedIPError,
} from './erreurs.ts';

export const AccountKind = { STUDENT: 6, PARENT: 7, TEACHER: 8 } as const;
export type AccountKind = (typeof AccountKind)[keyof typeof AccountKind];

export const TabLocation = { Grades: 198 } as const;

/** Le client d'application mobile dont Pawnote se réclame. */
export const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 PRONOTE Mobile APP Version/2.0.11';

/** La clé publique RSA de Pronote, quand la page n'en donne pas. */
const RSA_MODULO_1024 =
  'B99B77A3D72D3A29B4271FC7B7300E2F791EB8948174BE7B8024667E915446D4EEA0C2424B8D1EBF7E2DDFF94691C6E994E839225C627D140A8F1146D1B0B5F18A09BBD3D8F421CA1E3E4796B301EEBCCF80D81A32A1580121B8294433C38377083C5517D5921E8A078CDC019B15775292EFDA2C30251B1CCABE812386C893E5';
const RSA_EXPONENT_1024 = '010001';

export type Fetcher = typeof fetch;

export interface Period {
  id: string;
  kind: number;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface SessionInformation {
  url: string;
  id: number;
  accountKind: AccountKind;
  demo: boolean;
  rsaModulus: string;
  rsaExponent: string;
  rsaFromConstants: boolean;
  aesIV: Uint8Array;
  aesKey: Uint8Array;
  skipEncryption: boolean;
  skipCompression: boolean;
  http: boolean;
  order: number;
}

export interface InstanceParameters {
  version: number[];
  navigatorIdentifier: string | null;
  periods: Period[];
}

export interface Tab {
  location: number;
  defaultPeriod?: Period;
  periods: Period[];
}

export interface UserResource {
  id: string;
  kind: number;
  name: string;
  establishmentName?: string;
  className?: string;
  tabs: Map<number, Tab>;
}

export interface SessionHandle {
  fetcher: Fetcher;
  information: SessionInformation;
  instance: InstanceParameters;
  resources: UserResource[];
  userResource: UserResource;
}

/** Une session vide (`createSessionHandle`). Le reste est posé à la connexion. */
export const createSessionHandle = (fetcher: Fetcher = fetch): SessionHandle =>
  ({ fetcher, resources: [] }) as unknown as SessionHandle;

const versionAuMoins =
  (amajeur: number, amineur: number, apatch: number) =>
  ([majeur, mineur, patch]: number[]): boolean => {
    if (majeur !== amajeur) return majeur > amajeur;
    if (mineur !== amineur) return mineur > amineur;
    return patch >= apatch;
  };
export const isVersionGte2024_3_9 = versionAuMoins(2024, 3, 9);
export const isVersionGte2025_1_3 = versionAuMoins(2025, 1, 3);

/** Les noms des propriétés de l'API, qui changent avec la version. */
export const apiProperties = (version: number[]) => {
  if (isVersionGte2025_1_3(version)) {
    return {
      data: 'data',
      orderNumber: 'no',
      secureData: 'dataSec',
      requestId: 'id',
      signature: 'Signature',
      session: 'session',
    };
  }
  const commun = {
    orderNumber: 'numeroOrdre',
    secureData: 'donneesSec',
    requestId: 'nom',
    session: 'session',
  };
  if (isVersionGte2024_3_9(version))
    return { ...commun, data: 'data', signature: 'Signature' };
  return { ...commun, data: 'donnees', signature: '_Signature_' };
};

/** L'adresse d'un établissement, sans page ni paramètre ni barre finale (`cleanURL`). */
export const cleanURL = (url: string): string => {
  const brute = new URL(url);
  const propre = new URL(`${brute.protocol}//${brute.host}${brute.pathname}`);
  const chemins = propre.pathname.split('/');
  if (chemins[chemins.length - 1].includes('.html')) chemins.pop();
  propre.pathname = chemins.join('/');
  return propre.href.endsWith('/') ? propre.href.slice(0, -1) : propre.href;
};

const CHEMIN_ESPACE: Record<number, string> = {
  6: 'eleve',
  7: 'parent',
  8: 'professeur',
};

const VERSION_DANS_LA_PAGE = />PRONOTE (?<version>\d+\.\d+\.\d+)/;

/**
 * Le JSON « relâché » de la fonction `Start(…)` de la page, rendu lisible :
 * clés entre guillemets, apostrophes changées en guillemets.
 */
export function lisStart(html: string): any {
  const nettoye = html.replace(/ /gu, '').replace(/\n/gu, '');
  const debut = nettoye.indexOf('Start(') + 'Start('.length;
  const relache = nettoye.substring(debut, nettoye.indexOf(')}catch'));
  return JSON.parse(
    relache
      .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/gu, '"$2": ')
      .replace(/'/gu, '"')
  );
}

export function decodeSessionInformation(
  start: any,
  base: string,
  version: number[]
): SessionInformation {
  const rsaFromConstants = !start.MR && !start.ER;
  const recente = isVersionGte2025_1_3(version);
  return {
    url: base,
    id: parseInt(start.h),
    accountKind: start.a,
    demo: start.d ?? false,
    rsaModulus: rsaFromConstants ? RSA_MODULO_1024 : start.MR,
    rsaExponent: rsaFromConstants ? RSA_EXPONENT_1024 : start.ER,
    rsaFromConstants,
    aesIV: aleatoire(16),
    aesKey: new Uint8Array(0),
    // Depuis 2025.1.3, les drapeaux disent ce qui est ACTIF ; avant, ce qui est sauté.
    skipEncryption: recente ? !start.CrA : (start.sCrA ?? false),
    skipCompression: recente ? !start.CoA : (start.sCoA ?? false),
    http: start.http ?? false,
    order: 0,
  };
}

/** La page mobile de l'espace : version de Pronote et paramètres de session. */
export async function sessionInformation(
  options: {
    base: string;
    kind: AccountKind;
    params: Record<string, string | number | boolean>;
    cookies: string[];
  },
  fetcher: Fetcher
): Promise<{ information: SessionInformation; version: number[] }> {
  const url = new URL(
    `${options.base}/mobile.${CHEMIN_ESPACE[options.kind]}.html`
  );
  for (const [cle, valeur] of Object.entries(options.params))
    url.searchParams.set(cle, String(valeur));

  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (options.cookies.length) headers.Cookie = options.cookies.join('; ');
  const html = await (
    await fetcher(url.href, { redirect: 'manual', headers })
  ).text();

  const version = html
    .match(VERSION_DANS_LA_PAGE)
    ?.groups?.version?.split('.')
    .map(Number);
  if (!version) throw new PageUnavailableError();

  try {
    return {
      information: decodeSessionInformation(
        lisStart(html),
        options.base,
        version
      ),
      version,
    };
  } catch {
    if (html.includes('Votre adresse IP est provisoirement suspendue'))
      throw new SuspendedIPError();
    if (html.includes('Le site est momentanément indisponible'))
      throw new BusyPageError();
    throw new PageUnavailableError();
  }
}

/** La clé et le vecteur courants ; le vecteur est vide au tout premier échange (`aesKeys`). */
const cles = (session: SessionHandle, vecteurVide = false) => ({
  cle: session.information.aesKey,
  vecteur: vecteurVide ? new Uint8Array(0) : session.information.aesIV,
});

/**
 * Un appel de fonction Pronote (`RequestFN` puis `ResponseFN`). Rend le contenu
 * déchiffré et décompressé de la réponse, déjà analysé.
 */
export async function requete(
  session: SessionHandle,
  nom: string,
  donnees: unknown
): Promise<any> {
  const info = session.information;
  const proprietes = apiProperties(session.instance.version);

  // ── La requête ──
  info.order++;
  const premier = info.order === 1;
  const kOrdre = cles(session, premier);
  const ordre = await aesChiffre(
    utf8(String(info.order)),
    kOrdre.cle,
    kOrdre.vecteur
  );
  const url = `${info.url}/appelfonction/${info.accountKind}/${info.id}/${ordre}`;

  let secure: unknown = donnees;
  const json = utf8(JSON.stringify(donnees) || '');
  let octets: Uint8Array = json;
  if (!info.skipCompression) {
    // Pronote compresse l'HEXADÉCIMAL de l'UTF-8 du JSON, pas le JSON lui-même.
    octets = await compresse(utf8(versHex(json)));
    secure = versHex(octets);
  }
  if (!info.skipEncryption) {
    const k = cles(session, premier);
    secure = await aesChiffre(octets, k.cle, k.vecteur);
  }

  const reponse = await session.fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({
      [proprietes.session]: info.id,
      [proprietes.orderNumber]: ordre,
      [proprietes.requestId]: nom,
      [proprietes.secureData]: secure,
    }),
  });
  const contenu = await reponse.text();

  // ── La réponse ──
  info.order++;
  try {
    const corps = JSON.parse(contenu);
    if (corps.Erreur)
      throw new ServerSideError(
        corps.Erreur.Titre || 'Erreur côté serveur Pronote.'
      );

    let data: any = corps[proprietes.secureData];
    let sortie: Uint8Array | null = null;
    if (!info.skipEncryption) {
      const k = cles(session);
      sortie = await aesDechiffre(data, k.cle, k.vecteur);
    }
    if (!info.skipCompression) {
      const compresses = sortie ?? deHex(data);
      data = deUtf8Souple(await decompresse(compresses));
    } else if (sortie) {
      data = deUtf8Souple(sortie);
    }
    if (typeof data === 'string') data = JSON.parse(data);

    if (typeof data?.[proprietes.signature]?.Erreur !== 'undefined') {
      throw new ServerSideError(data[proprietes.signature].MessageErreur);
    }
    return data;
  } catch (erreur) {
    if (contenu.includes('La page a expir')) throw new SessionExpiredError();
    if (contenu.includes('Votre adresse IP ')) throw new SuspendedIPError();
    if (contenu.includes('La page dem') || contenu.includes("Impossible d'a"))
      throw new PageUnavailableError();
    if (contenu.includes('Vous avez d')) throw new RateLimitedError();
    // « Accès refusé », sans dépendre des accents.
    if (contenu.includes('s refus')) throw new AccessDeniedError();
    throw erreur;
  }
}
