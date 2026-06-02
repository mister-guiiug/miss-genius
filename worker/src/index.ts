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
 *  - `pawnote` est **non officielle** (rétro-ingénierie) : l'API peut évoluer
 *    (ce Worker cible pawnote 1.6.x). Vérifier après toute mise à jour.
 *  - Les identifiants transitent par ce Worker le temps de la requête : ne rien
 *    journaliser, restreindre `ALLOWED_ORIGIN`, préférer un usage personnel.
 *  - Respecter les conditions d'utilisation de votre établissement / Pronote.
 *
 * Endpoint : POST /grades  { url, username, password }
 *   -> { ok: true, period?: string, grades: [{ subject, value, max, coefficient?, date?, label? }] }
 *   -> { error: string } (status 4xx/5xx)
 */
import {
  AccountKind,
  createSessionHandle,
  GradeKind,
  gradesOverview,
  loginCredentials,
  TabLocation,
} from 'pawnote';

interface Env {
  ALLOWED_ORIGIN?: string;
}

interface Body {
  url?: string;
  username?: string;
  password?: string;
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

function toIsoDate(d: Date): string | undefined {
  return d instanceof Date && !Number.isNaN(d.getTime())
    ? d.toISOString().slice(0, 10)
    : undefined;
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
      });

      // Onglet Notes -> période courante (sinon la première disponible).
      const tab = session.userResource.tabs.get(TabLocation.Grades);
      const period = tab?.defaultPeriod ?? tab?.periods[0];
      if (!period) {
        return json({ error: 'Aucune période de notes disponible.' }, 502, env);
      }

      const overview = await gradesOverview(session, period);
      const grades = overview.grades
        // On ne garde que les vraies notes chiffrées (pas Absent/Non noté…).
        .filter(g => g.value.kind === GradeKind.Grade && g.outOf.points > 0)
        .map(g => ({
          subject: g.subject.name,
          value: g.value.points,
          max: g.outOf.points,
          coefficient: g.coefficient,
          date: toIsoDate(g.date),
          label: g.comment || undefined,
        }));

      return json({ ok: true, period: period.name, grades }, 200, env);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Connexion Pronote échouée.';
      return json({ error: message }, 502, env);
    }
  },
};
