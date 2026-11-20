// SPDX-License-Identifier: GPL-3.0-or-later
//
// Le client Pronote du Worker (src/pronote/), sans compte réel : les
// primitives contre `node:crypto` et `node:zlib`, puis la connexion complète
// contre le faux serveur de faux-pronote.ts — le même que Pawnote 1.6.2
// traverse sans erreur dans les neuf cas ci-dessous.

// Le Worker tourne en UTC chez Cloudflare : les dates des notes sont lues comme là-bas.
process.env.TZ = 'UTC';

import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

import { md5 } from '../src/pronote/md5.ts';
import {
  aesChiffre,
  aesDechiffre,
  compresse,
  decompresse,
  rsaChiffre,
} from '../src/pronote/chiffrement.ts';
import { versBase64 } from '../src/pronote/octets.ts';
import { cleanURL, lisStart } from '../src/pronote/session.ts';
import { decodePronoteDate } from '../src/pronote/dates.ts';
import {
  AccountKind,
  BadCredentialsError,
  GradeKind,
  TabLocation,
  createSessionHandle,
  gradesOverview,
  loginCredentials,
} from '../src/pronote/index.ts';
import { fauxPronote, type OptionsFauxPronote } from './faux-pronote.ts';
import worker from '../src/index.ts';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

test('MD5 : vecteurs de la RFC 1321 et octets au hasard', () => {
  assert.equal(hex(md5(new Uint8Array(0))), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(
    hex(md5(new TextEncoder().encode('abc'))),
    '900150983cd24fb0d6963f7d28e17f72'
  );
  for (const n of [1, 55, 56, 63, 64, 65, 1000]) {
    const b = randomBytes(n);
    assert.equal(
      hex(md5(b)),
      createHash('md5').update(b).digest('hex'),
      `${n} octets`
    );
  }
});

test('AES : clé et vecteur passés au MD5, vecteur vide = zéros, comme Pawnote', async () => {
  const cle = randomBytes(10);
  const iv = randomBytes(16);
  const clair = new TextEncoder().encode('Données à chiffrer 🎓');
  const attendu = (vecteur: Buffer) => {
    const c = createCipheriv(
      'aes-128-cbc',
      createHash('md5').update(cle).digest(),
      vecteur.length
        ? createHash('md5').update(vecteur).digest()
        : Buffer.alloc(16)
    );
    return Buffer.concat([c.update(clair), c.final()]).toString('hex');
  };
  assert.equal(await aesChiffre(clair, cle, iv), attendu(iv));
  assert.equal(
    await aesChiffre(clair, cle, new Uint8Array(0)),
    attendu(Buffer.alloc(0))
  );
  assert.deepEqual([...(await aesDechiffre(attendu(iv), cle, iv))], [...clair]);
  await assert.rejects(aesDechiffre(attendu(iv), randomBytes(10), iv));
});

test('RSA PKCS#1 v1.5 : 00 02, remplissage non nul, 00, message', () => {
  // Avec l'exposant 1, le bloc chiffré EST le bloc remplissé : on en lit la
  // structure. Le chiffrement réel (clé de 1024 bits, déchiffrement par la clé
  // privée) est éprouvé par la connexion au faux serveur, plus bas.
  const n = 0xf7e75fdc469067ffdc4e847c51f452dfe85cedfb2c6e6a1d1c9b0d1b6fa3e2c5n;
  const message = randomBytes(16);
  const bloc = rsaChiffre(message, n.toString(16), '1');
  assert.equal(bloc.length, Math.ceil(n.toString(16).length / 2));
  assert.equal(bloc[0], 0);
  assert.equal(bloc[1], 2);
  const separateur = bloc.indexOf(0, 2);
  assert.ok(bloc.slice(2, separateur).every(o => o !== 0));
  assert.deepEqual(Buffer.from(bloc.slice(separateur + 1)), message);
  assert.throws(
    () => rsaChiffre(randomBytes(60), n.toString(16), '1'),
    /trop long/
  );
});

test('base64 : une fin de ligne tous les 64 caractères, comme forge', () => {
  const b = randomBytes(128);
  const sortie = versBase64(b, 64);
  const lignes = sortie.split('\r\n');
  assert.deepEqual(
    lignes.map(l => l.length),
    [64, 64, 44]
  );
  assert.equal(lignes.join(''), b.toString('base64'));
  assert.equal(versBase64(randomBytes(16), 64).includes('\r\n'), false);
});

test('deflate brut : lisible par zlib, et lit zlib', async () => {
  const texte = Buffer.from('{"data":{"é":1}}'.repeat(20));
  assert.deepEqual(inflateRawSync(await compresse(texte)), texte);
  assert.deepEqual(
    Buffer.from(await decompresse(deflateRawSync(texte))),
    texte
  );
});

test('adresse, page d’accueil et dates', () => {
  assert.equal(
    cleanURL(
      'https://0123456a.index-education.net/pronote/eleve.html?identifiant=x#y'
    ),
    'https://0123456a.index-education.net/pronote'
  );
  assert.equal(
    cleanURL('https://exemple.fr/pronote/'),
    'https://exemple.fr/pronote'
  );
  assert.deepEqual(
    lisStart(
      `<script>try { Start ({h:'42',a:6,MR:'AB',ER:'10001',CrA:true}) } catch (e) {}</script>`
    ),
    { h: '42', a: 6, MR: 'AB', ER: '10001', CrA: true }
  );
  assert.equal(decodePronoteDate('05/12/2025').getDate(), 5);
  assert.equal(decodePronoteDate('05/12/25 14h30').getFullYear(), 2025);
  assert.throws(() => decodePronoteDate('2025-12-05'));
});

const CAS: Array<[string, OptionsFauxPronote]> = [
  ['2025.2.5, chiffré et compressé', {}],
  ['2024.3.9 (data, Signature)', { version: '2024.3.9' }],
  ['2023.0.1 (donnees, _Signature_)', { version: '2023.0.1' }],
  ['double authentification : reprise par jeton', { doubleAuth: true }],
  ['identifiant en minuscules (modeCompLog)', { modeCompLog: 1 }],
  ['clé RSA par défaut, http:false', { rsa: 'constantes' }],
  ['sans chiffrement', { chiffre: false }],
  ['sans compression', { compresse: false }],
  ['ni chiffrement ni compression', { chiffre: false, compresse: false }],
];

for (const [nom, options] of CAS) {
  test(`connexion et notes : ${nom}`, async () => {
    const serveur = fauxPronote(options);
    const session = createSessionHandle(serveur.fetch);
    const r = await loginCredentials(session, {
      url: 'https://pronote.test/pronote/eleve.html?x=1',
      kind: AccountKind.STUDENT,
      username: serveur.options.identifiant,
      password: serveur.options.motDePasse,
      deviceUUID: 'essai',
    });
    assert.equal(r.token, serveur.jeton);
    assert.equal(session.userResource.name, 'DUPONT Léa');

    const onglet = session.userResource.tabs.get(TabLocation.Grades);
    const periode = onglet?.defaultPeriod ?? onglet?.periods[0];
    assert.equal(periode?.name, 'Trimestre 2');

    const { grades } = await gradesOverview(session, periode!);
    assert.deepEqual(
      grades.map(g => [
        g.subject.name,
        g.value.kind,
        g.value.kind === GradeKind.Grade ? g.value.points : null,
        g.outOf.points,
        g.coefficient,
        g.isBonus,
      ]),
      [
        ['Français', GradeKind.Grade, 15.5, 20, 2, false],
        ['Mathématiques', GradeKind.Absent, null, 20, 1, false],
        ['Mathématiques', GradeKind.Grade, 8, 10, 1, true],
      ]
    );
    const attendu = options.doubleAuth
      ? [
          'GET page',
          'FonctionParametres',
          'Identification',
          'Authentification',
          'GET page (appliMobile=1)',
          'FonctionParametres',
          'Identification',
          'Authentification',
          'ParametresUtilisateur',
          'DernieresNotes',
        ]
      : [
          'GET page',
          'FonctionParametres',
          'Identification',
          'Authentification',
          'ParametresUtilisateur',
          'DernieresNotes',
        ];
    assert.deepEqual(serveur.journal, attendu);
  });
}

test('mauvais mot de passe : BadCredentialsError', async () => {
  const serveur = fauxPronote();
  await assert.rejects(
    loginCredentials(createSessionHandle(serveur.fetch), {
      url: 'https://pronote.test/pronote/',
      kind: AccountKind.STUDENT,
      username: serveur.options.identifiant,
      password: 'pas-le-bon',
      deviceUUID: 'essai',
    }),
    BadCredentialsError
  );
});

test('le Worker : POST /grades rend le contrat de l’application', async () => {
  const serveur = fauxPronote();
  const fetchOrigine = globalThis.fetch;
  globalThis.fetch = serveur.fetch;
  try {
    const requete = new Request('https://worker.test/grades', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://pronote.test/pronote/eleve.html',
        username: serveur.options.identifiant,
        password: serveur.options.motDePasse,
      }),
    });
    const reponse = await worker.fetch(requete, {
      ALLOWED_ORIGIN: 'https://mister-guiiug.github.io',
    });
    assert.equal(reponse.status, 200);
    assert.equal(
      reponse.headers.get('Access-Control-Allow-Origin'),
      'https://mister-guiiug.github.io'
    );
    assert.deepEqual(await reponse.json(), {
      ok: true,
      period: 'Trimestre 2',
      grades: [
        {
          subject: 'Français',
          value: 15.5,
          max: 20,
          coefficient: 2,
          date: '2025-12-05',
          label: 'Dictée',
        },
        {
          subject: 'Mathématiques',
          value: 8,
          max: 10,
          coefficient: 1,
          date: '2026-01-15',
        },
      ],
    });

    const mauvais = await worker.fetch(
      new Request('https://worker.test/grades', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://pronote.test/pronote/',
          username: 'x',
          password: 'y',
        }),
      }),
      {}
    );
    assert.equal(mauvais.status, 502);
    assert.ok((await mauvais.json()).error);
  } finally {
    globalThis.fetch = fetchOrigine;
  }
});
