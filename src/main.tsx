import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@mister-guiiug/dev-wpa-config/react';
import {
  installErrorReporter,
  recordError,
} from '@mister-guiiug/dev-wpa-config/react/observability';
import { App } from './App.tsx';
import { useAppStore } from './store/useAppStore.ts';
import './index.css';

installErrorReporter();

// Applique le thème persisté au plus tôt (complète le script anti-FOUC).
document.documentElement.dataset.theme =
  useAppStore.getState().data.settings.theme;

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Élément racine #root introuvable.');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary
      onError={error => {
        recordError(error, { source: 'error-boundary' });
      }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>
);
