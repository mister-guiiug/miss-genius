// SPDX-License-Identifier: GPL-3.0-or-later
//
// UN FAUX SERVEUR PRONOTE, côté serveur du protocole, pour éprouver le client
// sans compte réel. Il a été validé le 20/11/2026 en y connectant Pawnote 1.6.2
// lui-même (connexion, reprise par jeton, notes, pour chaque génération de
// l'API) : un client qu'il accepte parle le protocole que parle Pawnote.
//
// Il vérifie ce qu'un vrai serveur vérifierait : le numéro d'ordre chiffré et
// sa suite, le vecteur transmis par RSA, la solution du défi, la clé de
// session, l'onglet et la période demandés.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  generateKeyPairSync,
  randomBytes,
} from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

export interface OptionsFauxPronote {
  /** Version servie dans la page, « 2025.2.5 » par défaut. */
  version?: string;
  identifiant?: string;
  motDePasse?: string;
  /** Exige la personnalisation de sécurité : la connexion doit reprendre par jeton. */
  doubleAuth?: boolean;
  /** Identifiant et mot de passe comparés en minuscules. */
  modeCompLog?: 0 | 1;
  /** La clé RSA vient de la page (MR/ER), ou des constantes du client. */
  rsa?: 'page' | 'constantes';
  chiffre?: boolean;
  compresse?: boolean;
}

const md5 = (b: Buffer) => createHash('md5').update(b).digest();
const ZERO = Buffer.alloc(16);
const aes = (donnees: Buffer, cle: Buffer, iv: Buffer) => {
  const c = createCipheriv('aes-128-cbc', md5(cle), iv.length ? md5(iv) : ZERO);
  return Buffer.concat([c.update(donnees), c.final()]);
};
const deAes = (hex: string, cle: Buffer, iv: Buffer) => {
  const d = createDecipheriv(
    'aes-128-cbc',
    md5(cle),
    iv.length ? md5(iv) : ZERO
  );
  return Buffer.concat([d.update(Buffer.from(hex, 'hex')), d.final()]);
};

const versionGte = (v: number[], a: number[]) => {
  for (let i = 0; i < 3; i++) if (v[i] !== a[i]) return v[i] > a[i];
  return true;
};

const proprietes = (v: number[]) =>
  versionGte(v, [2025, 1, 3])
    ? { data: 'data', no: 'no', sec: 'dataSec', id: 'id', sig: 'Signature' }
    : versionGte(v, [2024, 3, 9])
      ? {
          data: 'data',
          no: 'numeroOrdre',
          sec: 'donneesSec',
          id: 'nom',
          sig: 'Signature',
        }
      : {
          data: 'donnees',
          no: 'numeroOrdre',
          sec: 'donneesSec',
          id: 'nom',
          sig: '_Signature_',
        };

// RSA privé à la main : Node refuse le déchiffrement PKCS#1 v1.5 depuis la CVE-2023-46809.
const b64url = (s: string) =>
  BigInt('0x' + Buffer.from(s, 'base64url').toString('hex'));
const modpow = (b: bigint, e: bigint, m: bigint) => {
  let r = 1n;
  b %= m;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return r;
};

export function fauxPronote(options: OptionsFauxPronote = {}) {
  const o = {
    version: '2025.2.5',
    identifiant: 'Eleve.Demo',
    motDePasse: 'Secret-2026',
    doubleAuth: false,
    modeCompLog: 0 as 0 | 1,
    rsa: 'page' as 'page' | 'constantes',
    chiffre: true,
    compresse: true,
    ...options,
  };
  const version = o.version.split('.').map(Number);
  const p = proprietes(version);
  const recente = versionGte(version, [2025, 1, 3]);
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const jwk = privateKey.export({ format: 'jwk' }) as { n: string; d: string };
  const n = b64url(jwk.n);
  const d = b64url(jwk.d);
  const jeton = 'jeton-' + randomBytes(8).toString('hex');
  const journal: string[] = [];
  const sessions = new Map<number, any>();

  const page = (h: number) => {
    const rsa =
      o.rsa === 'page'
        ? `MR:'${n.toString(16).toUpperCase()}',ER:'10001',`
        : '';
    const drapeaux = recente
      ? `${o.chiffre ? 'CrA:true,' : ''}${o.compresse ? 'CoA:true,' : ''}`
      : `sCrA:${!o.chiffre},sCoA:${!o.compresse},`;
    return `<!DOCTYPE html><html><body><div>PRONOTE ${o.version} - Index Education</div>
<script>try { Start ({h:'${h}',a:6,${rsa}${drapeaux}http:false}) } catch (e) {}</script></body></html>`;
  };

  const encode = (s: any, contenu: unknown) => {
    const json = Buffer.from(JSON.stringify(contenu), 'utf8');
    if (!o.chiffre && !o.compresse) return contenu;
    let octets = o.compresse ? deflateRawSync(json) : json;
    if (o.chiffre) return aes(octets, s.cle, s.iv).toString('hex');
    return octets.toString('hex');
  };

  const decode = (s: any, secure: any, premier: boolean) => {
    if (!o.chiffre && !o.compresse) return secure;
    let octets = o.chiffre
      ? deAes(secure, s.cle, premier ? Buffer.alloc(0) : s.iv)
      : Buffer.from(secure, 'hex');
    if (o.compresse)
      octets = Buffer.from(inflateRawSync(octets).toString('ascii'), 'hex');
    return JSON.parse(octets.toString('utf8'));
  };

  const PERIODES = [
    {
      N: 'p1',
      G: 1,
      L: 'Trimestre 1',
      dateDebut: { V: '01/09/2025' },
      dateFin: { V: '30/11/2025' },
    },
    {
      N: 'p2',
      G: 1,
      L: 'Trimestre 2',
      dateDebut: { V: '01/12/2025' },
      dateFin: { V: '28/02/2026' },
    },
  ];

  const fonctions: Record<string, (s: any, data: any) => unknown> = {
    FonctionParametres(s, data) {
      const parametres = data.data ?? data.donnees;
      const brut = Buffer.from(
        String(parametres.Uuid).replace(/\r\n/g, ''),
        'base64'
      );
      if (o.rsa === 'page') {
        const em = modpow(BigInt('0x' + brut.toString('hex')), d, n)
          .toString(16)
          .padStart(256, '0');
        const octets = Buffer.from(em, 'hex');
        if (octets[0] !== 0 || octets[1] !== 2)
          throw new Error('remplissage RSA invalide');
        s.iv = octets.subarray(octets.indexOf(0, 2) + 1);
      } else s.iv = brut;
      if (s.iv.length !== 16)
        throw new Error(`vecteur de ${s.iv.length} octets`);
      return {
        [p.data]: {
          identifiantNav: 'nav-42',
          General: {
            versionPN: o.version,
            ListePeriodes: PERIODES,
            // Ce qu'un vrai serveur envoie aussi, et que Pawnote décode.
            DomainesFrequences: [null, { V: '[1..3]' }, { V: '[4..6]' }],
            LibellesFrequences: ['', 'Semaine A', 'Semaine B'],
            JourOuvre: { V: '20/11/2025' },
            PremierLundi: { V: '01/09/2025' },
            PremiereDate: { V: '01/09/2025' },
            DerniereDate: { V: '04/07/2026' },
            ListeHeuresFin: { V: [{ L: '08h55' }, { L: '09h50' }] },
            listeJoursFeries: { V: [] },
            PlacesParJour: 20,
          },
        },
      };
    },
    Identification(s, corps) {
      const data = corps[p.data];
      const parJeton = s.parJeton;
      if (
        data.identifiant !== o.identifiant &&
        data.identifiant !== o.identifiant.toLowerCase()
      )
        throw new Error('identifiant inconnu');
      if (
        data.demandeConnexionAppliMobile === parJeton ||
        data.enConnexionAppliMobile !== parJeton
      )
        throw new Error('mode de connexion incohérent');
      const secret = parJeton ? jeton : o.motDePasse;
      const login = o.modeCompLog ? o.identifiant.toLowerCase() : o.identifiant;
      const alea = randomBytes(8).toString('hex');
      const cle = Buffer.from(
        login +
          createHash('sha256')
            .update(alea + secret)
            .digest('hex')
            .toUpperCase(),
        'latin1'
      );
      const clair = 'défi-' + randomBytes(12).toString('hex');
      s.solution = [...clair].filter((_, i) => i % 2 === 0).join('');
      s.cleIntermediaire = cle;
      return {
        [p.data]: {
          alea,
          challenge: aes(Buffer.from(clair, 'utf8'), cle, s.iv).toString('hex'),
          modeCompLog: o.modeCompLog,
          modeCompMdp: 0,
          login,
        },
      };
    },
    Authentification(s, corps) {
      const data = corps[p.data];
      let solution = '';
      try {
        solution = deAes(data.challenge, s.cleIntermediaire, s.iv).toString(
          'utf8'
        );
      } catch {}
      if (solution !== s.solution) return { [p.data]: { Acces: 1 } };
      const nouvelle = [...randomBytes(16)];
      s.prochaineCle = Buffer.from(nouvelle);
      const reponse: any = {
        cle: aes(
          Buffer.from(nouvelle.join(','), 'utf8'),
          s.cleIntermediaire,
          s.iv
        ).toString('hex'),
        jetonConnexionAppliMobile: jeton,
      };
      if (o.doubleAuth && !s.parJeton)
        reponse.actionsDoubleAuth = { V: '[1,3]' };
      return { [p.data]: reponse };
    },
    ParametresUtilisateur(s) {
      return {
        [p.data]: {
          ressource: {
            N: 'r1',
            G: 4,
            L: 'DUPONT Léa',
            Etablissement: { V: { L: 'Collège Test' } },
            classeDEleve: { L: '4A' },
            listeOngletsPourPeriodes: {
              V: [
                {
                  G: 198,
                  listePeriodes: { V: [{ N: 'p1' }, { N: 'p2' }] },
                  periodeParDefaut: { V: { N: 'p2' } },
                },
              ],
            },
          },
          // Ce qu'un vrai serveur envoie aussi, et que Pawnote décode.
          autorisations: {
            AvecDiscussion: false,
            tailleMaxRenduTafEleve: 4194304,
          },
          listeOnglets: [{ G: 198 }],
        },
      };
    },
    DernieresNotes(_s, corps) {
      if (corps[p.sig]?.onglet !== 198) throw new Error('onglet absent');
      if (corps[p.data]?.Periode?.N !== 'p2')
        throw new Error('période inattendue');
      const service = (N: string, L: string) => ({ V: { N, L } });
      return {
        [p.data]: {
          // Ce qu'un vrai serveur envoie aussi, et que Pawnote décode.
          listeServices: { V: [] },
          listeDevoirs: {
            V: [
              {
                N: 'd1',
                note: { V: '15,5' },
                bareme: { V: '20' },
                baremeParDefaut: { V: '20' },
                date: { V: '05/12/2025' },
                service: service('s1', 'Français'),
                coefficient: 2,
                commentaire: 'Dictée',
              },
              {
                N: 'd2',
                note: { V: '|1' },
                bareme: { V: '20' },
                baremeParDefaut: { V: '20' },
                date: { V: '12/12/2025' },
                service: service('s2', 'Mathématiques'),
                coefficient: 1,
                commentaire: '',
              },
              {
                N: 'd3',
                note: { V: '8' },
                bareme: { V: '10' },
                baremeParDefaut: { V: '20' },
                date: { V: '15/01/2026' },
                service: service('s2', 'Mathématiques'),
                coefficient: 1,
                estBonus: true,
              },
            ],
          },
        },
      };
    },
  };

  const reponse = (corps: unknown, statut = 200) =>
    new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), {
      status: statut,
    });

  const faux = async (
    entree: string | URL | Request,
    init: RequestInit = {}
  ): Promise<Response> => {
    const url = new URL(
      typeof entree === 'string'
        ? entree
        : entree instanceof URL
          ? entree.href
          : entree.url
    );
    const cookies = String(
      (init.headers as Record<string, string> | undefined)?.Cookie ??
        (init.headers as Record<string, string> | undefined)?.cookie ??
        ''
    );

    if (/\/mobile\.eleve\.html$/.test(url.pathname)) {
      const h = 1000 + sessions.size;
      sessions.set(h, {
        iv: Buffer.alloc(0),
        cle: Buffer.alloc(0),
        ordre: 1,
        parJeton: cookies.includes('appliMobile=1'),
      });
      journal.push(`GET page${cookies ? ` (${cookies})` : ''}`);
      return reponse(page(h));
    }

    const m = /\/appelfonction\/6\/(\d+)\/([0-9a-f]+)$/.exec(url.pathname);
    if (!m) return reponse('introuvable', 404);
    const s = sessions.get(Number(m[1]));
    const corps = JSON.parse(String(init.body));
    const premier = s.ordre === 1;

    const ordre = deAes(m[2], s.cle, premier ? Buffer.alloc(0) : s.iv).toString(
      'utf8'
    );
    if (ordre !== String(s.ordre))
      throw new Error(`ordre ${ordre} au lieu de ${s.ordre}`);
    if (corps[p.no] !== m[2])
      throw new Error('ordre du corps différent de celui de l’URL');
    const nom = corps[p.id];
    journal.push(nom);

    const donnees = decode(s, corps[p.sec], premier);
    const sortie = fonctions[nom](s, donnees);
    s.ordre += 2;
    const envoi = reponse({ [p.id]: nom, [p.sec]: encode(s, sortie) });
    if (s.prochaineCle) {
      s.cle = s.prochaineCle;
      s.prochaineCle = null;
    }
    return envoi;
  };

  return { fetch: faux as typeof fetch, journal, jeton, options: o };
}
