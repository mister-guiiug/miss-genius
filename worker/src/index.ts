/**
 * Proxy Pronote — Cloudflare Worker.
 *
 * Pourquoi : Pronote n'a pas d'API publique et n'autorise pas les requêtes
 * cross-origin depuis un navigateur (CORS). Ce Worker s'exécute côté serveur,
 * se connecte à Pronote via la librairie non officielle `pawnote`, et renvoie
 * au PWA un JSON normalisé (contrat partagé avec
 * `src/features/pronote/pronoteContract.ts`).
 *
 * ⚠️ Avertissements
 *  - `pawnote` est une librairie **non officielle** (rétro-ingénierie) : l'API
 *    et les noms de champs peuvent évoluer. Adapter `extractGrades()` si besoin.
 *  - Les identifiants transitent par ce Worker le temps de la requête : ne rien
 *    journaliser, restreindre `ALLOWED_ORIGIN`, et préférer un usage personnel.
 *  - Respecter les conditions d'utilisation de votre établissement / Pronote.
 *
 * Endpoint : POST /grades  { url, username, password, ent? }
 *   -> { ok: true, period?: string, grades: [{ subject, value, max, coefficient?, date?, label? }] }
 *   -> { error: string } (status 4xx/5xx)
 */

// `pawnote` est résolu au déploiement (cf. worker/package.json). Les types
// exacts dépendent de la version installée — d'où les accès défensifs.
import {
  createSessionHandle,
  loginCredentials,
  gradesOverview,
  AccountKind,
} from 'pawnote';

interface Env {
  ALLOWED_ORIGIN?: string;
}

interface Body {
  url?: string;
  username?: string;
  password?: string;
  ent?: string;
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
}

function json(data: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(env) },
  });
}

/** Adapte la sortie pawnote au contrat. À ajuster selon la version de pawnote. */
function extractGrades(overview: any): Array<{
  subject: string;
  value: number;
  max: number;
  coefficient?: number;
  date?: string;
  label?: string;
}> {
  const list = overview?.grades ?? [];
  const num = (v: any): number =>
    typeof v === 'number' ? v : typeof v?.value === 'number' ? v.value : NaN;
  return list
    .map((g: any) => ({
      subject: String(g?.subject?.name ?? g?.subject ?? '').trim(),
      value: num(g?.value),
      max: num(g?.outOf ?? g?.max),
      coefficient:
        typeof g?.coefficient === 'number' ? g.coefficient : undefined,
      date:
        typeof g?.date?.toISOString === 'function'
          ? g.date.toISOString().slice(0, 10)
          : typeof g?.date === 'string'
            ? g.date.slice(0, 10)
            : undefined,
      label: g?.comment || g?.description || undefined,
    }))
    .filter(
      (g: { subject: string; value: number; max: number }) =>
        g.subject &&
        Number.isFinite(g.value) &&
        Number.isFinite(g.max) &&
        g.max > 0
    );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    const { pathname } = new URL(request.url);
    if (request.method !== 'POST' || !pathname.endsWith('/grades')) {
      return json({ error: 'Endpoint inconnu.' }, 404, env);
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return json({ error: 'Corps JSON invalide.' }, 400, env);
    }
    const { url, username, password } = body;
    if (!url || !username || !password) {
      return json(
        { error: 'url, username et password sont requis.' },
        400,
        env
      );
    }

    try {
      const session = createSessionHandle();
      await loginCredentials(session, {
        url,
        kind: AccountKind.STUDENT,
        username,
        password,
        deviceUUID: `miss-genius-${username}`,
      } as any);

      // Sélection de la période courante (sinon la première disponible).
      const resource = (session as any).user?.resources?.[0];
      const periods: any[] =
        resource?.grades?.periods ?? resource?.periods ?? [];
      const period =
        periods.find((p: any) => p?.isCurrent) ?? periods[0] ?? null;

      const overview = await gradesOverview(session, period?.id ?? period);
      const grades = extractGrades(overview);

      return json({ ok: true, period: period?.name, grades }, 200, env);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Connexion Pronote échouée.';
      return json({ error: message }, 502, env);
    }
  },
};
