# 🧠 Miss Genius

> PWA mobile-first de **simulation de moyennes scolaires** : matières, notes,
> coefficients, **scénarios** d'hypothèses et **objectifs**. Notes gardées sur
> l'appareil, utilisable hors ligne, installable.

Famille `miss-*` / `mister-*` — conventions partagées via
[`@mister-guiiug/dev-pwa-config`](https://github.com/mister-guiiug/dev-pwa-config)
(TypeScript strict, cible ES2025, ESLint flat config, Prettier, Vitest).

---

## 1. Choix d'architecture (résumé)

- **Local-first.** Toute la logique vit dans le navigateur. Aucune dépendance
  réseau pour les fonctions principales ; ce qui sort malgré tout de l'appareil
  est listé dans « Confidentialité ». Le modèle de données est un **snapshot
  JSON unique**, ce qui rend l'export/import trivial et prépare une future
  synchro cloud (push/pull d'un seul document).
- **Connecteur Pronote optionnel** (`worker/`, Cloudflare Worker) : un relais
  qui récupère les notes Pronote. Le build publié ne le branche pas
  (`VITE_PRONOTE_PROXY_URL` n'y est pas posée) : l'écran Pronote n'y propose que
  des données de démonstration.
- **Découpage par feature** (`features/*`) au-dessus d'un socle partagé
  (`shared/*`) : types métier, moteur de calcul **pur**, store, composants UI.
- **Moteur de calcul = fonctions pures** (`shared/lib/average.ts`,
  `simulate.ts`), sans état ni dépendance React → testé exhaustivement à part.
- **State = Zustand** : léger, sélecteurs granulaires (pas de re-render global).
  Une seule porte de sortie vers le stockage (`persist()`), donc pas d'oubli de
  sauvegarde.
- **Scénario = univers complet et autonome** (ses matières + notes + objectif).
  Dupliquer = cloner le snapshot, ce qui permet de faire diverger des hypothèses
  sans contaminer la base.
- **PWA** via `vite-plugin-pwa` (Workbox), `registerType: 'prompt'` → message
  clair quand une mise à jour est disponible.
- **Rive** isolé, _lazy_, dimensionné, avec **fallback statique systématique**.

### Compromis assumés

| Décision                             | Pourquoi                                                                                                                                                     | Alternative                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **localStorage** plutôt qu'IndexedDB | Volume minuscule (< 100 Ko), accès synchrone → store simple, snapshot = unité naturelle d'export/sync                                                        | IndexedDB quand les volumes grossiront (le contrat `load/save/export/import` resterait identique) |
| **Routing par hash** (`HashRouter`)  | Déploiement GitHub Pages sans config serveur                                                                                                                 | History API + redirections                                                                        |
| **Rive en fallback par défaut**      | Pas d'asset `.riv` binaire fourni ; le moteur WebGL (215 Ko) n'est jamais chargé tant qu'aucun `.riv` n'est branché → zéro coût sur mobile d'entrée de gamme | Fournir des `.riv` dans `public/rive/`                                                            |
| **Pas de lib UI tierce**             | Tailwind v4 + composants légers du socle famille (`@mister-guiiug/dev-pwa-config/react`), mobile-first                                                       | shadcn/Radix si besoin d'a11y avancée                                                             |

---

## 2. Arborescence

```
miss-genius/
├─ public/icons/            # icône source SVG + PNG générés (script sharp)
├─ scripts/generate-maskable.mjs  # icône maskable + icône Apple
├─ e2e/                     # Playwright : a11y.spec.ts, share.spec.ts
├─ worker/                  # connecteur Pronote optionnel (Cloudflare Worker)
├─ src/
│  ├─ main.tsx              # bootstrap + thème
│  ├─ App.tsx              # app shell : router, layout, lazy routes
│  ├─ index.css            # design system « Miss Genius » (Tailwind v4 @theme)
│  ├─ i18n/                # textes français et anglais
│  ├─ store/
│  │  └─ useAppStore.ts    # Zustand : source de vérité + persistance
│  ├─ pwa/
│  │  └─ UpdatePrompt.tsx  # bandeau « mise à jour / hors ligne prêt »
│  ├─ shared/
│  │  ├─ types/domain.ts   # types métier
│  │  ├─ lib/
│  │  │  ├─ average.ts     # moteur : moyennes (pures)        + tests
│  │  │  ├─ simulate.ts    # moteur : simulation & note cible + tests
│  │  │  ├─ storage.ts     # persistance + migrations + zod   + tests
│  │  │  ├─ schema.ts      # validation runtime (zod)
│  │  │  ├─ seed.ts · id.ts · format.ts · colors.ts · cn.ts
│  │  ├─ hooks/useScenarioResults.ts
│  │  └─ components/       # AppHeader, badges, SubjectIcon, RiveEmptyState,
│  │     │                 #   ScenarioShareActions (Button, Card, Field, Sheet,
│  │     │                 #   ConfirmDialog, EmptyState, BottomNav : socle)
│  │     └─ RiveBadge.tsx · RivePlayer.tsx  # Rive isolé + lazy + fallback
│  ├─ features/
│  │  ├─ dashboard/        # tableau de bord (+ test d'intégration)
│  │  ├─ subjects/         # CRUD matières
│  │  ├─ grades/           # notes + simulateur de note future
│  │  ├─ periods/          # trimestres, semestres ou année
│  │  ├─ scenarios/        # créer / dupliquer / comparer
│  │  ├─ goals/            # objectif + « que me faut-il ? »
│  │  ├─ settings/         # export/import JSON, arrondis, reset
│  │  ├─ pronote/          # import Pronote (démonstration sans relais)
│  │  └─ onboarding/       # onboarding court (3 écrans)
│  └─ test/setup.ts
├─ vite.config.ts · vitest.config.ts · eslint.config.js · prettier.config.js
└─ tsconfig*.json
```

## 3. Dépendances & justification

| Paquet                                | Rôle               | Justification                                                  |
| ------------------------------------- | ------------------ | -------------------------------------------------------------- |
| `react` / `react-dom` 19              | UI                 | Standard famille                                               |
| `react-router-dom` 7                  | Routing            | Onglets / bottom nav, routes lazy                              |
| `zustand` 5                           | State              | Léger, sélecteurs granulaires, zéro boilerplate                |
| `zod` 4                               | Validation runtime | Sécurise l'import JSON et la relecture du stockage             |
| `tailwindcss` 4 + `@tailwindcss/vite` | Styles             | Mobile-first, tokens via `@theme`, design system maison        |
| `@rive-app/react-webgl2`              | Animations         | 1–2 points d'interaction, **lazy** (code-split, hors précache) |
| `vite-plugin-pwa`                     | PWA                | Manifest + service worker Workbox, prompt de mise à jour       |
| `vitest` + Testing Library            | Tests              | Unitaires (calcul) + intégration (écrans)                      |
| `sharp` (dev)                         | Icônes             | Génère les PNG depuis le SVG source                            |
| `@sentry/react`                       | Erreurs            | Démarre à l'ouverture, sans consentement ; hors précache       |
| `posthog-js`                          | Mesure d'audience  | Après accord dans le bandeau de consentement (nuage européen)  |

Pas de dépendance superflue (date lib, state manager lourd, UI kit) : assumé.

## 4–8. Moteur, écrans, PWA, persistance

- **Moteur de calcul** — `src/shared/lib/average.ts` + `simulate.ts` :
  moyenne simple, pondérée par note, pondérée par matière, moyenne générale,
  simulation d'une note future, **note cible nécessaire** (matière _et_ moyenne
  générale), arrondis configurables (`nearest`/`floor`/`ceil`/`none`), bases
  différentes normalisables, et cas limites (aucune note, coef nul, valeurs
  invalides) → renvoient `null` ou un `reason` explicite plutôt que de planter.
- **Écrans** — Dashboard, Matières, Détail matière (+ simulateur), Scénarios
  (comparaison d'écarts), Objectif (« Que me faut-il pour atteindre 14/20 ? »),
  Réglages, Onboarding. Les notes se rangent par **période** (trimestres,
  semestres ou année), choisie dans une barre sur l'accueil, les matières et le
  détail d'une matière.
- **Partage** — `shared/lib/scenarioSummary.ts` : le scénario en texte
  (matières, moyennes, objectif, note nécessaire au prochain contrôle), passé
  au partage natif avec repli presse-papiers, ou mis en page en PDF
  (`scenarioPdf.ts`). Le partage ne part que sur un geste explicite.
- **PWA** — `vite.config.ts` (manifest complet, icônes any/maskable, shortcuts,
  standalone, `navigateFallback`), précache raisonnable (Rive exclu),
  `UpdatePrompt` pour les mises à jour.
- **Persistance** — `src/shared/lib/storage.ts` : enveloppe versionnée + chaîne
  de **migrations** + validation zod + export/import JSON + réinitialisation.

## 9–10. Tests

- **Unitaires (moteur)** — `average.test.ts`, `simulate.test.ts`,
  `storage.test.ts` : pondérations, normalisation des bases, arrondis, note
  cible (ok / déjà atteint / impossible / invalide), round-trip export/import.
- **Intégration (écran critique)** — `DashboardScreen.test.tsx` : état vide,
  puis moyenne générale pondérée réelle après saisie (store + calcul + rendu).
- **E2E (Playwright)** — `e2e/a11y.spec.ts` (`@a11y`) et `e2e/share.spec.ts`
  (`@critical`) : ce que le bouton « Partager » transmet réellement, partage
  natif comme repli presse-papiers. Exécuté en CI (`run-e2e: true`, filtre
  `@critical|@a11y` du socle) ; en local : `npx playwright install` puis
  `npm run test:e2e`.

```bash
npm test            # 94 tests unitaires + intégration
npm run test:coverage
```

## 11. Commandes

```bash
# Prérequis : Node 26 (.nvmrc), au minimum 22.22 ou 24.15 (jsdom 30).
# Le paquet de config partagée est sur GitHub Packages, il faut un token
# avec read:packages :
export NODE_AUTH_TOKEN="$(gh auth token)"   # ou un PAT read:packages

npm install
npm run dev          # serveur de dev (http://localhost:5173)
npm run build        # tsc -b + build de prod (génère le service worker)
npm run preview      # prévisualise le build (base /miss-genius/)
npm run lint         # ESLint flat config
npm run format       # Prettier
npm test             # Vitest
npm run icons        # régénère les icônes PWA depuis le SVG
npm run icons:maskable  # icône maskable + icône Apple
```

## 12. Améliorations futures

- Synchro cloud optionnelle (le snapshot JSON est déjà l'unité d'échange).
- Migration vers IndexedDB si les volumes grossissent.
- Import/export **CSV** en plus du JSON.
- **Badges** de progression et mini tableau analytique d'évolution.
- Brancher de vraies animations `.riv` (onboarding, succès d'ajout de note,
  variation de moyenne) dans `public/rive/`.

## Univers visuel « Miss Genius »

Intelligent, motivant, scolaire moderne, féminin sans être infantilisant et
**déclinable** : violet profond (`--color-primary`) + corail (`--color-accent`),
accents pastel par matière, coins très arrondis, typographie _Fredoka_ (display)

- _Plus Jakarta Sans_ (texte). Dark mode inclus. Changer `--mg-*` / `--color-*`
  dans `src/index.css` suffit à redéfinir une marque.

## Accessibilité

Labels liés, `aria-invalid` + messages d'erreur `role="alert"`, focus visible
homogène, zones tactiles ≥ 44 px, dialogues `role="dialog"` (Échap, focus,
scroll verrouillé), tendances jamais portées par la **seule** couleur (icône +
signe + libellé lecteur d'écran), `prefers-reduced-motion` respecté.

## Confidentialité

Notes, scénarios et réglages restent dans le `localStorage` de l'appareil ; le
partage (texte ou PDF) ne part que sur un geste explicite. Trois flux sortent
pourtant de l'appareil :

- **Sentry** (région UE) : démarre à l'ouverture, sans consentement ; il signale
  la session et reçoit un rapport quand une erreur survient.
- **PostHog** (nuage européen) : la mesure d'audience ne démarre qu'après accord
  dans le bandeau de consentement ; un refus n'envoie rien.
- **Google Fonts** : les polices Fredoka et Plus Jakarta Sans sont demandées à
  Google au chargement de la page, ce qui lui transmet l'adresse IP du visiteur.

---

MIT © GuiiuG
