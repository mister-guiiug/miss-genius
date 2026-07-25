import { lazy, Suspense } from 'react';
import {
  HashRouter,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { useAppStore } from './store/useAppStore.ts';
import { useI18n } from './i18n';
import { AppHeader } from './shared/components/AppHeader.tsx';
import { BottomNav } from './shared/components/BottomNav.tsx';
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

function Shell() {
  const { pathname } = useLocation();
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
      <BottomNav />
      <UpdatePrompt />
    </div>
  );
}

export function App() {
  const onboarded = useAppStore(s => s.data.onboarded);

  if (!onboarded) return <Onboarding />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardScreen />} />
          <Route path="subjects" element={<SubjectsScreen />} />
          <Route path="subjects/:subjectId" element={<SubjectDetailScreen />} />
          <Route path="scenarios" element={<ScenariosScreen />} />
          <Route path="goal" element={<GoalScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
