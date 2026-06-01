import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../shared/components/Button.tsx';

/**
 * Bandeau PWA : informe quand une nouvelle version est disponible (registerType
 * 'prompt') et propose de recharger. Affiche aussi le passage en mode hors ligne.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-[var(--mg-border)] bg-[var(--mg-surface)] p-4 shadow-lg mg-rise"
    >
      <p className="mb-3 text-sm font-semibold">
        {needRefresh
          ? '✨ Une nouvelle version de Miss Genius est prête.'
          : '✅ Miss Genius fonctionne maintenant hors ligne.'}
      </p>
      <div className="flex gap-2">
        {needRefresh && (
          <Button block onClick={() => updateServiceWorker(true)}>
            Mettre à jour
          </Button>
        )}
        <Button variant="secondary" block onClick={close}>
          {needRefresh ? 'Plus tard' : 'OK'}
        </Button>
      </div>
    </div>
  );
}
