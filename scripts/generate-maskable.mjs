/**
 * Rend les deux images sans coin transparent : le maskable Android (512) et
 * l'icône d'accueil iOS (180), depuis `public/icons/icon-maskable.svg`.
 *
 * POURQUOI UN SVG À PART, ET PAS LE MODE MASKABLE D'UN GÉNÉRATEUR. Fabriquer un
 * maskable en RÉDUISANT la tuile sur un aplat laisse voir le raccord, et le
 * masque d'Android le révèle au lieu de le cacher. C'est ce que faisait
 * l'ancien script : l'icône entière ramenée à 80 % sur `#7c3aed`, l'arrêt HAUT
 * du dégradé — donc un bas de tuile rose posé sur du violet uni. Un maskable se
 * DESSINE à fond perdu, et `icon-maskable.svg` dit ce qui l'écarte de
 * `icon.svg` : un `rx` en moins, et rien d'autre.
 *
 * POURQUOI L'ICÔNE APPLE EST ICI, ET PLUS DANS `npm run icons`. iOS n'accepte
 * pas la transparence : il comble les coins de la tuile arrondie par une
 * couleur. L'ancien script l'anticipait en aplatissant sur `#7c3aed` — mais le
 * fond est un DÉGRADÉ, et un aplat unique ne peut pas coïncider avec deux coins
 * de teintes différentes. Mesuré sur le fichier livré jusqu'au 14/09/2026 :
 * coin `124,58,237` quand le bord rendait `155,59,208`.
 *
 * Ici, aucune ruse n'est nécessaire : `icon-maskable.svg` ne réduit RIEN — son
 * encre culmine à 196,5 px pour une zone sûre à 204,8 — donc l'icône Apple en
 * sort directement, à taille pleine et sans un pixel transparent.
 *
 * Exécuter : npm run icons:maskable
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const icones = join(racine, 'public', 'icons');

// `density` : sans elle, sharp pixellise le SVG à 72 ppp AVANT de
// redimensionner, et le dégradé en ressort bandé.
const rend = (taille, nom) =>
  sharp(join(icones, 'icon-maskable.svg'), { density: 384 })
    .resize(taille, taille)
    .png()
    .toFile(join(icones, nom));

await rend(512, 'icon-512-maskable.png');
await rend(180, 'apple-touch-icon.png');

console.log(
  'public/icons/icon-512-maskable.png (512×512) et public/icons/apple-touch-icon.png (180×180) écrits, à fond perdu.'
);
