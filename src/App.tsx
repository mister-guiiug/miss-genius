import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ComponentProps,
  type MouseEvent,
} from 'react';
import {
  HashRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  BookOpen,
  House,
  LoaderCircle,
  Settings,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { BottomNav } from '@mister-guiiug/dev-pwa-config/react/bottom-nav';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { ConsentBanner } from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { repoUrl } from '@mister-guiiug/dev-pwa-config/apps-catalog';
import { useAppStore } from './store/useAppStore.ts';
import { useI18n } from './i18n';
import { AppHeader } from './shared/components/AppHeader.tsx';
import { Onboarding } from './features/onboarding/Onboarding.tsx';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';
import { DashboardScreen } from './features/dashboard/DashboardScreen.tsx';

// Routes secondaires chargées à la demande (perf : on n'embarque pas tout au boot).
//
// CHAQUE IMPORT D'UN ÉCRAN DU MENU EST NOMMÉ, parce qu'il sert DEUX FOIS : à
// `lazy` ci-dessous, et au chargeur composé `chargeLesEcransDuMenu`, que le
// socle lance à l'inactivité. Deux `import()` du même spécificateur ne
// téléchargent qu'une fois — le registre de modules dédoublonne — mais encore
// faut-il que ce soit LITTÉRALEMENT le même spécificateur, sinon le bundler
// émet deux morceaux et le préchargement ne sert plus à rien.
const chargeSubjects = () => import('./features/subjects/SubjectsScreen.tsx');
const chargeScenarios = () =>
  import('./features/scenarios/ScenariosScreen.tsx');
const chargeGoal = () => import('./features/goals/GoalScreen.tsx');
const chargeSettings = () => import('./features/settings/SettingsScreen.tsx');

/**
 * Les quatre écrans qu'une entrée de la barre basse peut atteindre — et eux
 * seuls. `SubjectDetailScreen` reste dehors : on y arrive depuis la liste des
 * matières, pas d'un clic dans le menu.
 */
const CHARGEURS_DU_MENU = [
  chargeSubjects,
  chargeScenarios,
  chargeGoal,
  chargeSettings,
];

/**
 * UN SEUL CHARGEUR POUR LE SOCLE, ET UNE CONSTANTE DE MODULE : `prefetch()` ne
 * lance un chargeur qu'une fois et le reconnaît à son IDENTITÉ de fonction — une
 * fonction recréée à chaque montage serait un chargeur neuf à chaque fois.
 * `allSettled` : un morceau qui manque n'empêche pas les autres d'arriver.
 */
const chargeLesEcransDuMenu = () =>
  Promise.allSettled(CHARGEURS_DU_MENU.map(charge => charge()));

const SubjectsScreen = lazy(() =>
  chargeSubjects().then(m => ({ default: m.SubjectsScreen }))
);
const SubjectDetailScreen = lazy(() =>
  import('./features/grades/SubjectDetailScreen.tsx').then(m => ({
    default: m.SubjectDetailScreen,
  }))
);
const ScenariosScreen = lazy(() =>
  chargeScenarios().then(m => ({ default: m.ScenariosScreen }))
);
const GoalScreen = lazy(() =>
  chargeGoal().then(m => ({ default: m.GoalScreen }))
);
const SettingsScreen = lazy(() =>
  chargeSettings().then(m => ({ default: m.SettingsScreen }))
);

/**
 * Le geste de navigation du menu, porté jusqu'au `linkComponent` du socle.
 *
 * POURQUOI UN CONTEXTE. `BottomNav` construit lui-même le `onClick` de chaque
 * lien — `onClick: () => { setMoreOpen(false); onNavigate?.(item); }`, SANS
 * l'événement — donc ni `preventDefault`, ni touche de modification, ni
 * transition ne peuvent passer par `onNavigate`. Le seul point d'entrée qui
 * reçoit l'événement est le composant de lien, et le socle ne lui transmet que
 * ce qu'il connaît. Un contexte l'atteint sans redéfinir le composant à chaque
 * rendu (ce qui le remonterait, et perdrait le focus au clavier).
 */
const NavigationDuMenu = createContext<{
  versLaVue: (e: MouseEvent<HTMLAnchorElement>, to: string) => void;
  enAttente: string | null;
} | null>(null);

function LienDeMenu({ to, onClick, ...reste }: ComponentProps<typeof NavLink>) {
  const menu = useContext(NavigationDuMenu);
  const cible = typeof to === 'string' ? to : '';
  return (
    <NavLink
      to={to}
      aria-busy={menu?.enAttente === cible || undefined}
      onClick={e => {
        onClick?.(e);
        menu?.versLaVue(e, cible);
      }}
      {...reste}
    />
  );
}

/**
 * Les cinq destinations de la navigation basse.
 *
 * Elles vivaient dans un `BottomNav` maison ; la barre vient maintenant du
 * socle, qui ne connaît pas les routes de l'app — elles se déclarent donc ici,
 * au seul endroit qui les connaît. Les libellés restent traduits à l'usage :
 * la table ne porte que la clé.
 */
const TABS: Array<{
  to: string;
  key: 'home' | 'subjects' | 'scenarios' | 'goal' | 'settings';
  Icon: LucideIcon;
  end: boolean;
}> = [
  { to: '/', key: 'home', Icon: House, end: true },
  { to: '/subjects', key: 'subjects', Icon: BookOpen, end: false },
  { to: '/scenarios', key: 'scenarios', Icon: SlidersHorizontal, end: false },
  { to: '/goal', key: 'goal', Icon: Target, end: false },
  { to: '/settings', key: 'settings', Icon: Settings, end: false },
];

/**
 * Exportée POUR ÊTRE ÉPROUVÉE : `App.nav.test.tsx` la monte face à un écran
 * dont il décide lui-même de l'arrivée, ce qu'on ne peut pas faire à travers
 * `App` sans mettre la main dans le registre de modules.
 */
export function Shell() {
  // PRÉCHARGE LES ÉCRANS DU MENU DÈS QUE LE FIL PRINCIPAL SOUFFLE. Sans ça, le
  // morceau d'un écran n'est demandé qu'AU CLIC : un aller-retour réseau payé
  // au pire moment — 133 ms sur mister-settle, 161 ms sur mister-molkky,
  // mesurés le 20/09/2026 à la première visite, service worker pas encore
  // installé. Le socle décide du reste : une seule fois par chargeur, rejets
  // avalés, rien sous `saveData` ni en 2g, un délai en repli là où
  // `requestIdleCallback` manque (Safari avant la 17). Ce préchargement
  // n'entre PAS dans `bundleBudget.preloadGzipKb`, qui ne compte que ce qui
  // est `modulepreload` dans le document.
  useIdlePrefetch(chargeLesEcransDuMenu);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [enCours, demarreLaTransition] = useTransition();
  const [ciblePendante, setCiblePendante] = useState<string | null>(null);

  /**
   * LA TRANSITION EST LA NÔTRE, et c'est tout l'intérêt.
   *
   * react-router 7 en ouvre déjà une de son côté — `startTransition(() =>
   * setStateImpl(newState))` dans son `HashRouter` — mais ne l'expose nulle
   * part hors d'un routeur de données. Or React 19 garde délibérément l'écran
   * déjà affiché pendant une transition : le repli de `<Suspense>` ci-dessous
   * ne paraît donc JAMAIS sur un clic, seulement sur un atterrissage direct.
   * Le clic restait muet le temps de l'aller-retour.
   *
   * En pilotant `navigate` depuis ici, `enCours` reste vrai tant que le morceau
   * de l'écran n'est pas arrivé : c'est la seule information qui manquait.
   */
  const versLaVue = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, to: string) => {
      // On laisse le navigateur faire son travail quand le visiteur le lui
      // demande : nouvel onglet, nouvelle fenêtre, enregistrement de la cible.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      e.preventDefault();
      setCiblePendante(to);
      demarreLaTransition(() => navigate(to));
    },
    [navigate]
  );
  // Une vue de page par navigation — ni zéro, ni deux. `initAnalytics` pose
  // `capture_pageview: false` pour que toutes passent par ici, la première
  // comprise : laissé à lui-même, PostHog compterait chaque navigation deux
  // fois. Rien sans consentement.
  usePageViews(pathname);
  const { t } = useI18n();
  // 'Miss Genius' est un nom propre (identique dans toutes les langues).
  const titles: Record<string, string> = {
    '/': 'Miss Genius',
    '/subjects': t('nav.subjects'),
    '/scenarios': t('nav.scenarios'),
    '/goal': t('nav.goal'),
    '/settings': t('nav.settings'),
  };
  const title =
    titles[pathname] ??
    (pathname.startsWith('/subjects/') ? t('app.subjectTitle') : 'Miss Genius');

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <AppHeader title={title} />
      <main className="flex-1">
        <Suspense
          fallback={
            <p className="p-8 text-center text-[var(--mg-text-soft)]">
              {t('common.loading')}
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      {/* HORS des routes : le code source et le soutien sont ainsi sur le
          premier écran comme sur les Réglages — la règle famille. Rendu
          depuis l'écran Réglages, ce pied de page ne valait que pour lui. */}
      <AppFooter
        version
        issues
        className="justify-center px-4 pb-2"
        repoUrl={repoUrl('miss-genius')}
        sourceLabel={t('footer.sourceCode')}
        sponsorLabel={t('footer.buyCoffee')}
      />
      <NavigationDuMenu.Provider
        value={{ versLaVue, enAttente: enCours ? ciblePendante : null }}
      >
        <BottomNav
          label={t('nav.ariaLabel')}
          currentPath={pathname}
          items={TABS.map(({ to, key, Icon, end }) => ({
            href: to,
            label: t(`nav.${key}`),
            // LA PASTILLE DE L'ENTRÉE CLIQUÉE TOURNE pendant que son morceau
            // arrive. C'est le seul retour visible : le repli de `Suspense` ne
            // paraîtra pas, React 19 gardant l'écran courant le temps de la
            // transition.
            icon:
              enCours && ciblePendante === to ? (
                <LoaderCircle
                  size={22}
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : (
                <Icon size={22} aria-hidden="true" />
              ),
            end,
          }))}
          // Le socle 3.32.0 a élargi `linkComponent` à `ComponentType<any>` :
          // le type refusait jusque-là tout composant à prop OBLIGATOIRE, donc
          // précisément le composant de lien de react-router et son `to` —
          // l'usage que sa propre documentation donne en exemple. Cinq apps
          // portaient la même conversion ; elle n'a plus lieu d'être.
          //
          // C'est désormais `LienDeMenu` — le `NavLink` du dessus, plus le
          // geste qui ouvre la transition. Le socle ne passe pas l'événement à
          // `onNavigate` : le composant de lien est le seul endroit qui l'ait.
          linkComponent={LienDeMenu}
          hrefProp="to"
        />
      </NavigationDuMenu.Provider>
      {/* HORS DES LIENS, pour ne pas changer leur nom accessible en cours de
          route : un lecteur d'écran annoncerait « Matières, chargement… » puis
          « Matières », sur le lien qui a le focus. */}
      <span className="sr-only" role="status" aria-live="polite">
        {enCours ? t('nav.loading') : ''}
      </span>
    </div>
  );
}

export function App() {
  const onboarded = useAppStore(s => s.data.onboarded);

  return (
    <>
      {onboarded ? (
        <HashRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<DashboardScreen />} />
              <Route path="subjects" element={<SubjectsScreen />} />
              <Route
                path="subjects/:subjectId"
                element={<SubjectDetailScreen />}
              />
              <Route path="scenarios" element={<ScenariosScreen />} />
              <Route path="goal" element={<GoalScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
            </Route>
          </Routes>
        </HashRouter>
      ) : (
        <Onboarding />
      )}
      {/*
        HORS DE L'ONBOARDING, ET CE N'EST PAS QU'UN BANDEAU. Ce composant
        appelle `registerSW` : rendu dans `Shell`, il vivait derrière l'écran
        d'accueil, donc AUCUN service worker n'était enregistré tant que
        l'onboarding n'était pas franchi, et rien n'était mis en cache.

        Mesuré le 16/09/2026 sur la production, navigateur vierge : six
        secondes après le chargement, `navigator.serviceWorker
        .getRegistrations()` rendait `[]` et `caches.keys()` aussi. Les deux
        autres apps du parc à écran d'entrée — miss-uwh et miss-ticket-pwa —
        en enregistraient bien un : celle-ci était la dernière.

        À la racine, la mise en cache commence dès la première visite, y
        compris pour qui referme l'app sans avoir rempli l'accueil.
      */}
      <UpdatePrompt />
      {/*
        HORS DE L'ONBOARDING, ET C'EST TOUT L'INTÉRÊT. Monté dans `Shell`, le
        bandeau vivait derrière l'écran d'accueil : un visiteur qui n'avait pas
        franchi l'onboarding n'a JAMAIS vu la question. Vérifié le 16/09/2026
        sur la production — `[data-dwc="consent-banner"]` absent du document.
        Cette app n'aurait donc rien mesuré, sa variable posée ou non.

        `sticky bottom-0` et non `fixed` : le bandeau reste dans le flux, ne
        recouvre que ce qui défile sous lui et ne piège pas le focus — une
        boîte modale pour obtenir un consentement est la figure que le RGPD
        nomme « dark pattern ». Sans ce calage il atterrirait en bas du
        document, sous la ligne de flottaison de l'onboarding.
      */}
      <div className="sticky bottom-0 mx-auto w-full max-w-md px-4 pb-3">
        <ConsentBanner
          posthogKey={import.meta.env.VITE_POSTHOG_KEY}
          loader={() => import('posthog-js/dist/module.slim.js')}
        />
      </div>
    </>
  );
}
