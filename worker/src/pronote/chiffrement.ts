// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * Le chiffrement et la compression de Pronote, sur les seules API du runtime
 * (WebCrypto, CompressionStream) : là où Pawnote prenait `node-forge` et
 * `pako`.
 */

import { md5 } from './md5.ts';
import { aleatoire, concat, deHex, versHex } from './octets.ts';

const VIDE = new Uint8Array(16);

/**
 * La clé et le vecteur réels d'un échange : le MD5 de ceux de la session ; un
 * vecteur vide devient seize zéros (`AES` de Pawnote).
 */
const cleEtVecteur = (cle: Uint8Array, vecteur: Uint8Array) => ({
  cle: md5(cle),
  vecteur: vecteur.length ? md5(vecteur) : VIDE,
});

const importe = (cle: Uint8Array) =>
  crypto.subtle.importKey('raw', cle, { name: 'AES-CBC' }, false, [
    'encrypt',
    'decrypt',
  ]);

/** AES-CBC, remplissage PKCS#7, sortie hexadécimale (`AES.encrypt`). */
export async function aesChiffre(
  donnees: Uint8Array,
  cle: Uint8Array,
  vecteur: Uint8Array
): Promise<string> {
  const k = cleEtVecteur(cle, vecteur);
  const sortie = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: k.vecteur },
    await importe(k.cle),
    donnees
  );
  return versHex(new Uint8Array(sortie));
}

/** AES-CBC depuis l'hexadécimal (`AES.decrypt`). Lève sur un remplissage invalide. */
export async function aesDechiffre(
  hex: string,
  cle: Uint8Array,
  vecteur: Uint8Array
): Promise<Uint8Array> {
  const k = cleEtVecteur(cle, vecteur);
  const sortie = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: k.vecteur },
    await importe(k.cle),
    deHex(hex)
  );
  return new Uint8Array(sortie);
}

/** SHA-256 en hexadécimal majuscule, comme la clé intermédiaire de Pawnote. */
export async function sha256HexMajuscule(donnees: Uint8Array): Promise<string> {
  return versHex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', donnees))
  ).toUpperCase();
}

const deOctets = (octets: Uint8Array): bigint =>
  octets.length ? BigInt('0x' + versHex(octets)) : 0n;

const versOctets = (n: bigint, longueur: number): Uint8Array =>
  deHex(n.toString(16).padStart(longueur * 2, '0'));

const puissanceModulaire = (
  base: bigint,
  exposant: bigint,
  module: bigint
): bigint => {
  let r = 1n;
  let b = base % module;
  let e = exposant;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % module;
    b = (b * b) % module;
    e >>= 1n;
  }
  return r;
};

/**
 * RSA, schéma RSAES-PKCS1-v1_5 (celui de `forge.pki.rsa` par défaut).
 * WebCrypto ne chiffre qu'en OAEP : Pronote attend PKCS#1 v1.5.
 */
export function rsaChiffre(
  message: Uint8Array,
  moduleHex: string,
  exposantHex: string
): Uint8Array {
  const n = BigInt('0x' + moduleHex);
  const e = BigInt('0x' + exposantHex);
  const k = Math.ceil(n.toString(16).length / 2);
  if (message.length > k - 11)
    throw new Error('Message trop long pour la clé RSA.');

  // EM = 00 || 02 || PS (octets aléatoires non nuls) || 00 || M
  const ps = new Uint8Array(k - message.length - 3);
  for (let i = 0; i < ps.length; i++) {
    let octet = 0;
    while (octet === 0) octet = aleatoire(1)[0];
    ps[i] = octet;
  }
  const em = concat(Uint8Array.of(0, 2), ps, Uint8Array.of(0), message);
  return versOctets(puissanceModulaire(deOctets(em), e, n), k);
}

async function parFlux(
  octets: Uint8Array,
  flux: TransformStream<Uint8Array, Uint8Array>
): Promise<Uint8Array> {
  const reponse = new Response(new Blob([octets]).stream().pipeThrough(flux));
  return new Uint8Array(await reponse.arrayBuffer());
}

/** Deflate brut, sans en-tête (`pako.deflateRaw`). */
export const compresse = (octets: Uint8Array) =>
  parFlux(octets, new CompressionStream('deflate-raw'));

/** Inflate brut (`pako.inflateRaw`). */
export const decompresse = (octets: Uint8Array) =>
  parFlux(octets, new DecompressionStream('deflate-raw'));
