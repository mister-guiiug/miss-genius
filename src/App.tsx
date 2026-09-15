import { lazy, Suspense } from 'react';
import {
  HashRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import {
  BookOpen,
  House,
  Settings,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { BottomNav } from '@mister-guiiug/dev-pwa-config/react/bottom-nav';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { ConsentBanner } from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';
import { repoUrl } from '@mister-guiiug/dev-pwa-config/apps-catalog';
import { useAppStore } from './store/useAppStore.ts';
import { useI18n } from './i18n';
import { AppHeader } from './shared/components/AppHeader.tsx';
import { Onboarding } from './features/onboarding/Onboarding.tsx';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';
import { DashboardScreen } from './features/dashboard/DashboardScreen.tsx';

// Routes secondaires chargées à la demande (perf : on n'embarque pas tout au boot).
const SubjectsScreen = lazy(() =>
  import('./features/subjects/SubjectsScreen.tsx').then(m => ({
    default: m.SubjectsScreen,
  }))
);
const SubjectDetailScreen = lazy(() =>
  import('./features/grades/SubjectDetailScreen.tsx').then(m => ({
    default: m.SubjectDetailScreen,
  }))
);
const ScenariosScreen = lazy(() =>
  import('./features/scenarios/ScenariosScreen.tsx').then(m => ({
    default: m.ScenariosScreen,
  }))
);
const GoalScreen = lazy(() =>
  import('./features/goals/GoalScreen.tsx').then(m => ({
    default: m.GoalScreen,
  }))
);
const SettingsScreen = lazy(() =>
  import('./features/settings/SettingsScreen.tsx').then(m => ({
    default: m.SettingsScreen,
  }))
);

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

function Shell() {
  const { pathname } = useLocation();
  // Une vue de page par navigation. GA4 n'en envoie qu'une par chargement de
  // document, et `initAnalytics` pose `send_page_view: false` pour que la
  // première passe par ici comme les autres. Rien sans consentement.
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
      <BottomNav
        label={t('nav.ariaLabel')}
        currentPath={pathname}
        items={TABS.map(({ to, key, Icon, end }) => ({
          href: to,
          label: t(`nav.${key}`),
          icon: <Icon size={22} aria-hidden="true" />,
          end,
        }))}
        // Le socle 3.32.0 a élargi `linkComponent` à `ComponentType<any>` :
        // le type refusait jusque-là tout composant à prop OBLIGATOIRE, donc
        // précisément le composant de lien de react-router et son `to` —
        // l'usage que sa propre documentation donne en exemple. Cinq apps
        // portaient la même conversion ; elle n'a plus lieu d'être.
        linkComponent={NavLink}
        hrefProp="to"
      />
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
          gaMeasurementId={import.meta.env.VITE_GA_MEASUREMENT_ID}
        />
      </div>
    </>
  );
}
