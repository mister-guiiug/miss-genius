# Proxy Pronote (Cloudflare Worker)

Petit serveur **relais** qui permet à Miss Genius (PWA statique) de récupérer
les notes Pronote **automatiquement**, malgré l'absence d'API publique et le
blocage CORS côté navigateur.

```
PWA (github.io)  ──POST /grades {url,user,pass}──▶  Worker  ──pawnote──▶  Pronote
       ◀──────────── JSON normalisé {grades[]} ───────────
```

## ⚠️ À lire avant de déployer

- **`pawnote` est non officiel** (rétro-ingénierie). L'API peut casser à toute
  mise à jour de Pronote ; adapter `extractGrades()` dans `src/index.ts`.
- **Identifiants sensibles** : ils transitent par le Worker le temps de la
  requête. Ne rien journaliser, restreindre `ALLOWED_ORIGIN`, usage personnel.
- **Conditions d'utilisation** : vérifier celles de votre établissement/Pronote.
- C'est la raison pour laquelle le connecteur est **opt-in** et désactivé par
  défaut (l'app reste 100% locale sans lui).

## Déploiement

```bash
cd worker
npm install
# Connexion Cloudflare (une fois)
npx wrangler login
# (optionnel) restreindre l'origine autorisée
#   éditer wrangler.toml -> ALLOWED_ORIGIN = "https://mister-guiiug.github.io"
npm run deploy
```

Wrangler affiche l'URL publique du Worker, par ex.
`https://miss-genius-pronote-proxy.<compte>.workers.dev`.

## Brancher le PWA

Côté Miss Genius, définir la variable d'environnement de build :

```bash
# .env.local (ou variable CI du job de déploiement Pages)
VITE_PRONOTE_PROXY_URL=https://miss-genius-pronote-proxy.<compte>.workers.dev
```

Rebuild + redeploy l'app : l'écran **Réglages → Connecter Pronote** propose
alors le formulaire d'identifiants. Sans cette variable, l'écran propose
uniquement l'import de **données de démonstration**.

## Contrat

`POST /grades` body `{ url, username, password, ent? }` →

```json
{
  "ok": true,
  "period": "Trimestre 1",
  "grades": [
    {
      "subject": "Mathématiques",
      "value": 15,
      "max": 20,
      "coefficient": 2,
      "date": "2026-09-12",
      "label": "Contrôle"
    }
  ]
}
```

Le PWA valide cette réponse (`src/features/pronote/pronoteContract.ts`) puis la
mappe en matières + notes (`pronoteMapping.ts`), importées dans la **période
active**.
