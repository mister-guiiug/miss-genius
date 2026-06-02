import {
  pronoteResponseSchema,
  type PronoteCredentials,
  type PronoteResponse,
} from './pronoteContract.ts';

/**
 * URL du proxy Pronote (Cloudflare Worker), injectée au build.
 * Vide -> connecteur non configuré (l'UI propose alors la démo).
 */
const PROXY_URL = (import.meta.env.VITE_PRONOTE_PROXY_URL ?? '').trim();

export function isPronoteConfigured(): boolean {
  return PROXY_URL.length > 0;
}

/**
 * Appelle le proxy pour récupérer les notes. Les identifiants transitent par le
 * Worker (server-to-server, contourne CORS) et ne sont jamais persistés.
 */
export async function fetchPronoteGrades(
  creds: PronoteCredentials
): Promise<PronoteResponse> {
  if (!isPronoteConfigured()) {
    throw new Error('Connecteur Pronote non configuré.');
  }
  let res: Response;
  try {
    res = await fetch(`${PROXY_URL.replace(/\/$/, '')}/grades`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(creds),
    });
  } catch {
    throw new Error('Connexion au connecteur impossible (réseau).');
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : `Le connecteur a renvoyé une erreur (${res.status}).`;
    throw new Error(message);
  }

  const parsed = pronoteResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Réponse du connecteur invalide.');
  }
  return parsed.data;
}
