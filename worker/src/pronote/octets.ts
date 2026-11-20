// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * Les octets, sans `node-forge`. Pawnote manipule des « chaînes binaires »
 * (un caractère par octet) ; ici, tout est `Uint8Array`, et les conversions
 * reproduisent celles de forge là où le protocole en dépend.
 */

const encodeur = new TextEncoder();
const decodeurStrict = new TextDecoder('utf-8', {
  fatal: true,
  ignoreBOM: false,
});

/** UTF-8 d'une chaîne (`forge.util.encodeUtf8`). */
export const utf8 = (texte: string): Uint8Array => encodeur.encode(texte);

/**
 * Chaîne d'octets UTF-8 (`forge.util.decodeUtf8`), qui lève sur une suite
 * invalide : c'est ce qui fait échouer un défi mal déchiffré.
 */
export const deUtf8 = (octets: Uint8Array): string =>
  decodeurStrict.decode(octets);

const decodeurSouple = new TextDecoder('utf-8');

/** UTF-8 tolérant, pour les réponses du serveur (`pako.inflateRaw(…, { to: 'string' })`). */
export const deUtf8Souple = (octets: Uint8Array): string =>
  decodeurSouple.decode(octets);

/**
 * Octets d'une chaîne « brute » : un caractère, un octet (`forge.util.createBuffer`
 * sans encodage). Seuls les 8 bits de poids faible comptent, comme chez forge.
 */
export const brut = (texte: string): Uint8Array => {
  const out = new Uint8Array(texte.length);
  for (let i = 0; i < texte.length; i++) out[i] = texte.charCodeAt(i) & 0xff;
  return out;
};

/** Hexadécimal en minuscules (`toHex`, `bytesToHex`). */
export const versHex = (octets: Uint8Array): string => {
  let s = '';
  for (const o of octets) s += o.toString(16).padStart(2, '0');
  return s;
};

/** Octets d'une chaîne hexadécimale (`hexToBytes`). */
export const deHex = (hex: string): Uint8Array => {
  const n = hex.length >> 1;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++)
    out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  return out;
};

/**
 * Base64 (`forge.util.encode64`). Avec `ligne`, une fin de ligne `\r\n` tous
 * les `ligne` caractères, sans fin de ligne après le dernier : forge le fait,
 * et Pronote lit l'identifiant de session tel que forge l'écrit.
 */
export const versBase64 = (octets: Uint8Array, ligne = 0): string => {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  const b64 = btoa(binaire);
  if (!ligne) return b64;
  const morceaux: string[] = [];
  for (let i = 0; i < b64.length; i += ligne)
    morceaux.push(b64.slice(i, i + ligne));
  return morceaux.join('\r\n');
};

export const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};

export const aleatoire = (n: number): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(n));
