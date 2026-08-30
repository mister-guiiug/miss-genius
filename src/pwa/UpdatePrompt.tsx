import { useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { CircleCheck } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { UpdatePromptBanner } from '@mister-guiiug/dev-wpa-config/react/update-prompt-banner';
import { useUpdatePrompt } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
import { useI18n } from '../i18n';

/**
 * Les deux nouvelles que le service worker peut annoncer.
 *
 * LA MISE À JOUR VIENT DU SOCLE. `UpdatePromptBanner` rend le bandeau, tient
 * son état, applique la mise à jour et offre la sortie. Il faut lui INJECTER
 * `registerSW` : sans cette prop, `needRefresh` reste faux et le bandeau ne
 * s'affiche jamais — sans erreur, sans test rouge, sans que rien ne le dise.
 * `UpdatePrompt.test.tsx` verrouille ce point précis.
 *
 * LE « PRÊT HORS LIGNE » RESTE LOCAL : le socle n'a pas d'équivalent. Le hook
 * expose bien `offlineReady`, mais aucun composant partagé ne le montre. C'est
 * une candidate à une évolution du socle, pas un motif pour perdre le message.
 *
 * DEUX APPELS, UN SEUL ENREGISTREMENT. Le bandeau monte son propre
 * `useUpdatePrompt`, et celui d'ici en monte un second. Ce n'est pas un
 * doublon : le hook mémorise sa connexion PAR RÉFÉRENCE de `registerSW`
 * (WeakMap), donc `registerSW` n'est appelé qu'une fois et les deux instances
 * lisent le même flux. On ne lit ici que des champs PARTAGÉS (`offlineReady`,
 * `needRefresh`) ; `visible` et `dismissed`, eux, sont propres à chaque
 * instance et n'auraient aucun sens de ce côté.
 *
 * PRÉCÉDENCE CONSERVÉE : tant qu'une mise à jour attend, le message hors ligne
 * s'efface. C'est ce que faisait la carte unique d'avant, qui basculait son
 * contenu au lieu d'afficher les deux.
 */

/** Carte flottante commune aux deux messages. */
const CARD =
  'fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-[var(--mg-border)] bg-[var(--mg-surface)] p-4 shadow-lg mg-rise';

function OfflineReadyNotice() {
  const { t } = useI18n();
  const { offlineReady, needRefresh } = useUpdatePrompt({ registerSW });
  const [dismissed, setDismissed] = useState(false);

  if (!offlineReady || dismissed || needRefresh) return null;

  return (
    <div role="status" aria-live="polite" className={CARD}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CircleCheck
          size={18}
          className="shrink-0 text-[var(--mg-good)]"
          aria-hidden="true"
        />
        {t('pwa.offlineReady')}
      </p>
      <Button variant="secondary" block onClick={() => setDismissed(true)}>
        {t('pwa.ok')}
      </Button>
    </div>
  );
}

export function UpdatePrompt() {
  const { t } = useI18n();

  return (
    <>
      <UpdatePromptBanner
        registerSW={registerSW}
        className={CARD}
        title={t('pwa.updateReady')}
        updateLabel={t('pwa.update')}
        dismissLabel={t('pwa.later')}
      />
      <OfflineReadyNotice />
    </>
  );
}
