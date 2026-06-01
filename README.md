# 🧠 Miss Genius

> PWA mobile-first de **simulation de moyennes scolaires** : matières, notes,
> coefficients, **scénarios** d'hypothèses et **objectifs**. 100 % local, 100 %
> hors ligne, installable.

Famille `miss-*` / `mister-*` — conventions partagées via
[`@mister-guiiug/dev-wpa-config`](https://github.com/mister-guiiug/dev-wpa-config)
(TypeScript strict, cible ES2025, ESLint flat config, Prettier, Vitest).

---

## 1. Choix d'architecture (résumé)

- **Local-first, sans backend.** Toute la logique vit dans le navigateur. Aucune
  dépendance réseau pour les fonctions principales. Le modèle de données est un
  **snapshot JSON unique**, ce qui rend l'export/import trivial et prépare une
  future synchro cloud (push/pull d'un seul document).
- **Découpage par feature** (`features/*`) au-dessus d'un socle partagé
  (`shared/*`) : types métier, moteur de calcul **pur**, store, composants UI.
- **Moteur de calcul = fonctions pures** (`shared/lib/average.ts`,
  `simulate.ts`), sans état ni dépendance React → testé exhaustivement à part.
- **State = Zustand** : léger, sélecteurs granulaires (pas de re-render global).
  Une seule porte de sortie vers le stockage (`commit()`), donc pas d'oubli de
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
| **Rive en fallback par défaut**      | Pas d'asset `.riv` binaire fourni ; le moteur WebGL (172 Ko) n'est jamais chargé tant qu'aucun `.riv` n'est branché → zéro coût sur mobile d'entrée de gamme | Fournir des `.riv` dans `public/rive/`                                                            |
| **Pas de lib UI**                    | Tailwind v4 + composants maison légers, mobile-first                                                                                                         | shadcn/Radix si besoin d'a11y avancée                                                             |

---

## 2. Arborescence

```
miss-genius/
├─ public/icons/            # icône source SVG + PNG générés (script sharp)
├─ scripts/generate-pwa-icons.mjs
├─ src/
│  ├─ main.tsx              # bootstrap + thème
│  ├─ App.tsx              # app shell : router, layout, lazy routes
│  ├─ index.css            # design system « Miss Genius » (Tailwind v4 @theme)
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
│  │  └─ components/       # Button, Card, Field, Sheet, ConfirmDialog,
│  │     │                 #   EmptyState, badges, BottomNav, AppHeader,
│  │     └─ RiveBadge.tsx · RivePlayer.tsx  # Rive isolé + lazy + fallback
│  ├─ features/
│  │  ├─ dashboard/        # tableau de bord (+ test d'intégration)
│  │  ├─ subjects/         # CRUD matières
│  │  ├─ grades/           # notes + simulateur de note future
│  │  ├─ scenarios/        # créer / dupliquer / comparer
│  │  ├─ goals/            # objectif + « que me faut-il ? »
│  │  ├─ settings/         # export/import JSON, arrondis, reset
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
| `zod` 3                               | Validation runtime | Sécurise l'import JSON et la relecture du stockage             |
| `tailwindcss` 4 + `@tailwindcss/vite` | Styles             | Mobile-first, tokens via `@theme`, design system maison        |
| `@rive-app/react-webgl2`              | Animations         | 1–2 points d'interaction, **lazy** (code-split, hors précache) |
| `vite-plugin-pwa`                     | PWA                | Manifest + service worker Workbox, prompt de mise à jour       |
| `vitest` + Testing Library            | Tests              | Unitaires (calcul) + intégration (écrans)                      |
| `sharp` (dev)                         | Icônes             | Génère les PNG depuis le SVG source                            |

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
  Réglages, Onboarding.
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

```bash
npm test            # 29 tests
npm run test:coverage
```

## 11. Commandes

```bash
# Prérequis : Node 22+. Le paquet de config partagée est sur GitHub Packages,
# il faut un token avec read:packages :
export NODE_AUTH_TOKEN="$(gh auth token)"   # ou un PAT read:packages

npm install
npm run dev          # serveur de dev (http://localhost:5173)
npm run build        # tsc -b + build de prod (génère le service worker)
npm run preview      # prévisualise le build (base /miss-genius/)
npm run lint         # ESLint flat config
npm run format       # Prettier
npm test             # Vitest
npm run icons        # régénère les icônes PWA depuis le SVG
```

## 12. Améliorations futures

- Synchro cloud optionnelle (le snapshot JSON est déjà l'unité d'échange).
- Migration vers IndexedDB si les volumes grossissent.
- Simulation par **trimestre / semestre** (périodes).
- Import/export **CSV** en plus du JSON.
- **Badges** de progression et mini tableau analytique d'évolution.
- Tests E2E Playwright (`@critical`, `@a11y`) comme les autres projets famille.
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

---

MIT © GuiiuG
