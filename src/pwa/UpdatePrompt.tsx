import { useRegisterSW } from 'virtual:pwa-register/react';
import { CircleCheck, Sparkles } from 'lucide-react';
import { Button } from '../shared/components/Button.tsx';
import { useI18n } from '../i18n';

/**
 * Bandeau PWA : informe quand une nouvelle version est disponible (registerType
 * 'prompt') et propose de recharger. Affiche aussi le passage en mode hors ligne.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
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
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {needRefresh ? (
          <>
            <Sparkles
              size={18}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            {t('pwa.updateReady')}
          </>
        ) : (
          <>
            <CircleCheck
              size={18}
              className="shrink-0 text-[var(--mg-good)]"
              aria-hidden="true"
            />
            {t('pwa.offlineReady')}
          </>
        )}
      </p>
      <div className="flex gap-2">
        {needRefresh && (
          <Button block onClick={() => updateServiceWorker(true)}>
            {t('pwa.update')}
          </Button>
        )}
        <Button variant="secondary" block onClick={close}>
          {needRefresh ? t('pwa.later') : t('pwa.ok')}
        </Button>
      </div>
    </div>
  );
}
