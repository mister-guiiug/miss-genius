import { useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { CircleCheck, Sparkles } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { useUpdatePrompt } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
import { useI18n } from '../i18n';

/**
 * Bandeau PWA : informe quand une nouvelle version est disponible (registerType
 * 'prompt') et propose de recharger. Affiche aussi le passage en mode hors ligne.
 *
 * L'état et l'application de la mise à jour viennent du hook du socle
 * (`use-update-prompt`), qui attend l'activation du worker avant de recharger.
 * Seul l'écartement du message « prêt hors ligne » reste local : le hook expose
 * `offlineReady` mais son `dismiss()` ne masque que le volet mise à jour.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const { offlineReady, visible, update, dismiss } = useUpdatePrompt({
    registerSW,
  });
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  const showOffline = offlineReady && !offlineDismissed;
  if (!showOffline && !visible) return null;

  const close = () => {
    setOfflineDismissed(true);
    dismiss();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-[var(--mg-border)] bg-[var(--mg-surface)] p-4 shadow-lg mg-rise"
    >
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {visible ? (
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
        {visible && (
          <Button block onClick={() => void update()}>
            {t('pwa.update')}
          </Button>
        )}
        <Button variant="secondary" block onClick={close}>
          {visible ? t('pwa.later') : t('pwa.ok')}
        </Button>
      </div>
    </div>
  );
}
