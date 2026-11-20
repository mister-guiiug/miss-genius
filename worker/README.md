# Proxy Pronote (Cloudflare Worker)

Petit serveur **relais** qui permet à Miss Genius (PWA statique) de récupérer
les notes Pronote **automatiquement**, malgré l'absence d'API publique et le
blocage CORS côté navigateur.

```
PWA (github.io)  ──POST /grades {url,user,pass}──▶  Worker  ──src/pronote/──▶  Pronote
       ◀──────────── JSON normalisé {grades[]} ───────────
```

## ⚠️ À lire avant de déployer

- **Le protocole Pronote n'est pas public** (rétro-ingénierie). Il peut casser à
  une mise à jour de Pronote ; le client (`src/pronote/`) reprend les noms de
  Pawnote.js pour qu'un correctif amont s'y reporte facilement.
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

### Déploiement automatique (GitHub Actions)

Le workflow [`.github/workflows/deploy-worker.yml`](../.github/workflows/deploy-worker.yml)
déploie le Worker à chaque push sur `main` touchant `worker/**` (et via
**Run workflow** manuel). Il nécessite deux **secrets de dépôt** :

| Secret                  | Rôle                                                 |
| ----------------------- | ---------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token Cloudflare avec la permission « Edit Workers » |
| `CLOUDFLARE_ACCOUNT_ID` | Identifiant du compte Cloudflare                     |

Tant que ces secrets sont absents, le job se termine en **succès** sans rien
déployer (le connecteur reste optionnel). Une étape _dry-run_ valide quand même
le bundling du Worker.

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

## Le client Pronote (`src/pronote/`)

Depuis le 20/11/2026, le Worker n'a plus de dépendance d'exécution : son client
Pronote est un **portage de [Pawnote.js](https://github.com/LiterateInk/Pawnote.js)
1.6.2** (© LiterateInk), réduit à ce qu'il utilise :

- connexion élève par identifiant et mot de passe, et reprise par jeton quand
  Pronote demande de personnaliser la sécurité du compte ;
- onglet Notes, périodes, notes d'une période.

Le chiffrement (AES-CBC, RSA PKCS#1 v1.5, SHA-256, MD5) et la compression
(deflate brut) passent par les API du runtime (WebCrypto, `CompressionStream`),
là où Pawnote prenait `node-forge` et `pako`. Le Worker empaqueté est passé
de 765 Kio (143 Kio compressés) à 49 Kio (14 Kio compressés).

### Tests

```bash
npm test        # node --test test/*.test.ts (Node >= 22.18)
npm run typecheck
```

Sans compte Pronote : `test/faux-pronote.ts` est un faux serveur qui joue le
côté serveur du protocole (numéro d'ordre, vecteur transmis par RSA, défi, clé
de session, onglet et période). Il a été validé en y connectant Pawnote 1.6.2
lui-même, dans neuf configurations (trois générations de l'API, double
authentification, identifiant en minuscules, clé RSA par défaut, sans
chiffrement, sans compression). Le client passe les mêmes neuf.

Ce que ces tests ne prouvent pas : qu'un **vrai** serveur Pronote n'a pas
changé depuis Pawnote 1.6.2. Avant de brancher l'application sur ce Worker,
essayer une connexion réelle (`npm run dev`, puis un `POST /grades`).

## Licence

Le dossier `worker/` est sous **GPL-3.0-or-later** ([LICENSE](LICENSE)),
comme Pawnote.js dont son client est dérivé. L'application Miss Genius, un
programme distinct qui ne fait que l'appeler en HTTP, reste sous MIT.
