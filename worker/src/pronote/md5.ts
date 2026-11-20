// SPDX-License-Identifier: GPL-3.0-or-later
// Portage de Pawnote.js (https://github.com/LiterateInk/Pawnote.js), © LiterateInk,
// sous GPL-3.0-or-later. Réécrit en TypeScript sans dépendance pour miss-genius.

/**
 * MD5 (RFC 1321). WebCrypto ne le fournit pas, et Pronote en tire ses clés et
 * ses vecteurs AES : sans lui, pas de session. Ce n'est pas un usage de
 * sécurité côté client, seulement l'accord avec le serveur.
 */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];

const K = Array.from(
  { length: 64 },
  (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0
);

export function md5(message: Uint8Array): Uint8Array {
  const longueur = message.length;
  const blocs = ((longueur + 8) >> 6) + 1;
  const mots = new Uint32Array(blocs * 16);
  for (let i = 0; i < longueur; i++)
    mots[i >> 2] |= message[i] << ((i % 4) * 8);
  mots[longueur >> 2] |= 0x80 << ((longueur % 4) * 8);
  const bits = longueur * 8;
  mots[blocs * 16 - 2] = bits >>> 0;
  mots[blocs * 16 - 1] = Math.floor(bits / 2 ** 32) >>> 0;

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let bloc = 0; bloc < blocs; bloc++) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      const x = (a + f + K[i] + mots[bloc * 16 + g]) >>> 0;
      b = (b + ((x << S[i]) | (x >>> (32 - S[i])))) >>> 0;
      a = tmp;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const out = new Uint8Array(16);
  [a0, b0, c0, d0].forEach((mot, i) => {
    for (let j = 0; j < 4; j++) out[i * 4 + j] = (mot >>> (j * 8)) & 0xff;
  });
  return out;
}
