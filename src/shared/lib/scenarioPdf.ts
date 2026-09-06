/**
 * Le même résumé, en PDF — le document qu'on garde, qu'on envoie, qu'on pose
 * sur la table.
 *
 * POURQUOI UN PDF ET PAS UNE FEUILLE `@media print`. Miss Genius est une PWA
 * mobile installée : en mode `standalone`, `window.print()` n'est pas offert
 * partout (iOS notamment), et là où il l'est, il imprime l'écran courant —
 * c'est-à-dire une colonne de cartes de 28 rem, avec sa barre de navigation
 * basse en `position: fixed` et ses dégradés. Une feuille d'impression devrait
 * défaire tout ça écran par écran, pour un résultat qui dépend encore du
 * pipeline d'impression du navigateur. Le générateur du socle, lui, produit un
 * FICHIER : identique partout, hors ligne, joignable à un message pour un
 * professeur — et il s'imprime, lui, sans rien réinventer. Le PDF est le
 * sur-ensemble ; l'impression n'aurait été qu'un cas particulier fragile.
 *
 * L'ENCODAGE, ET POURQUOI LA TABLE EST SI COURTE. Le générateur encode en
 * WinAnsi (CP1252) — qui n'est PAS Latin-1 : il porte déjà l'apostrophe
 * typographique, les tirets cadratins, les guillemets courbes et les points de
 * suspension dont les messages de l'app sont pleins. Les transcrire serait
 * dégrader le document pour rien. `toPdfText` ne s'occupe donc que de ce que
 * CP1252 n'a pas : le moins typographique et les espaces fines d'`Intl`,
 * transcrits ; les émojis (un nom de matière est saisi par l'utilisateur),
 * retirés — le générateur les rendrait « ? ».
 */

import { dateSlug } from '@mister-guiiug/dev-pwa-config/download';
import { slugify } from '@mister-guiiug/dev-pwa-config/format';
import {
  PAGE,
  PdfContent,
  buildPdf,
  downloadPdf,
  textWidth,
} from '@mister-guiiug/dev-pwa-config/pdf';
import {
  buildScenarioSummaryLines,
  type ScenarioSummaryInput,
} from './scenarioSummary.ts';

/** Ce que CP1252 ne sait pas écrire et que le résumé peut pourtant produire. */
const PDF_CHAR_MAP: Readonly<Record<string, string>> = {
  '−': '-', // moins typographique, rendu par `formatDelta`
  '→': '->', // flèche
  ' ': ' ', // espace fine insécable — séparateur de milliers d'`Intl`
  ' ': ' ', // espace fine
  ' ': ' ', // espace insécable (encodable, mais illisible à l'extraction)
};

/**
 * Émojis et leurs greffons (sélecteur de variante, liant de largeur nulle) :
 * un nom de matière en porte parfois, et le générateur les rendrait « ? ».
 *
 * Écrit en `new RegExp` : les deux greffons sont INVISIBLES dans une littérale
 * de motif, et une relecture ne verrait qu'une classe de caractères vide.
 */
const PICTOGRAPHIC = new RegExp(
  '[\\p{Extended_Pictographic}\\uFE0F\\u200D]',
  'gu'
);

/**
 * Rend une ligne sûre pour l'encodage WinAnsi du générateur. Ce qu'il sait
 * déjà écrire (Latin-1 ET la ponctuation typographique de CP1252) traverse
 * intact : cf. l'en-tête.
 */
export function toPdfText(text: string): string {
  let out = '';
  for (const ch of text.replace(PICTOGRAPHIC, '')) {
    out += PDF_CHAR_MAP[ch] ?? ch;
  }
  return out;
}

/** Les lignes du PDF : exactement celles du résumé texte, transcrites. */
export function buildScenarioPdfLines(input: ScenarioSummaryInput): string[] {
  return buildScenarioSummaryLines(input).map(toPdfText);
}

const MARGIN_X = 48;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 52;
const TITLE_SIZE = 16;
const META_SIZE = 10;
const BODY_SIZE = 11;
const LEADING = 15;

/** Coupe une ligne trop large en morceaux tenant dans `maxWidth` points. */
function wrapPdfLine(text: string, size: number, maxWidth: number): string[] {
  if (textWidth(text, size) <= maxWidth) return [text];
  const out: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (current !== '' && textWidth(candidate, size) > maxWidth) {
      out.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== '') out.push(current);
  return out;
}

/**
 * Met en page le résumé — nom du scénario, période, puis les lignes (têtes de
 * section en gras) — sur autant de pages A4 que nécessaire.
 */
export function renderScenarioPdf(input: ScenarioSummaryInput): Uint8Array {
  const [title = '', period = '', ...body] = buildScenarioPdfLines(input);
  const maxWidth = PAGE.w - MARGIN_X * 2;

  const pages: PdfContent[] = [];
  let page = new PdfContent();
  pages.push(page);
  let y = MARGIN_TOP;

  page.text(MARGIN_X, y, TITLE_SIZE, title, { bold: true });
  y += 18;
  page.text(MARGIN_X, y, META_SIZE, period, { color: [0.4, 0.4, 0.4] });
  y += 8;
  page.line(MARGIN_X, y, PAGE.w - MARGIN_X, y, 0.8, 0.75);
  y += 22;

  for (const line of body) {
    if (line === '') {
      y += LEADING / 2;
      continue;
    }
    // Règle sobre, partagée avec le résumé texte : une ligne finissant par
    // « : » est une tête de section.
    const bold = line.endsWith(':');
    for (const chunk of wrapPdfLine(line, BODY_SIZE, maxWidth)) {
      if (y > PAGE.h - MARGIN_BOTTOM) {
        page = new PdfContent();
        pages.push(page);
        y = MARGIN_TOP;
      }
      page.text(MARGIN_X, y, BODY_SIZE, chunk, { bold });
      y += LEADING;
    }
  }

  return buildPdf(pages);
}

/** `miss-genius-mon-bulletin-AAAA-MM-JJ.pdf` — daté, et nommé par le scénario. */
export function scenarioPdfFilename(
  scenarioName: string,
  date?: Date | number
): string {
  const slug = slugify(scenarioName) || 'scenario';
  return `miss-genius-${slug}-${dateSlug(date)}.pdf`;
}

/** Génère puis télécharge le PDF ; `false` si aucun DOM n'est disponible. */
export function downloadScenarioPdf(input: ScenarioSummaryInput): boolean {
  return downloadPdf(
    renderScenarioPdf(input),
    scenarioPdfFilename(input.scenario.name)
  );
}
