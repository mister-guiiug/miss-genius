import { useEffect, useRef, useState } from 'react';
import { FileDown, Share2 } from 'lucide-react';
import {
  currentAppUrl,
  shareOrCopy,
} from '@mister-guiiug/dev-pwa-config/share';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useAppStore } from '../../store/useAppStore.ts';
import { useI18n } from '../../i18n';
import { cn } from '../lib/cn.ts';
import type { Scenario } from '../types/domain.ts';
import {
  buildScenarioShareTitle,
  buildScenarioSummaryText,
  type ScenarioSummaryInput,
} from '../lib/scenarioSummary.ts';

type Feedback = 'idle' | 'copied' | 'failed' | 'pdfDone' | 'pdfFailed';

interface ScenarioShareActionsProps {
  scenario: Scenario;
  /**
   * Ajoute le bouton PDF. Réservé au tableau de bord : la liste des scénarios
   * porte déjà quatre actions par carte, et un document se prend là où on
   * regarde ses moyennes.
   */
  pdf?: boolean;
  className?: string;
}

/**
 * « Partager » et « PDF » pour un scénario donné.
 *
 * DEUX PORTES, UN SEUL TEXTE : les deux boutons appellent le même
 * `buildScenarioSummaryLines`. Ce qui est partagé et ce qui est imprimé ne
 * peuvent donc pas diverger.
 *
 * CE QUE LE RETOUR DIT, ET NE DIT PAS. `shareOrCopy` distingue l'annulation de
 * l'échec ; une feuille de partage refermée n'affiche rien — la personne a
 * changé d'avis, pas échoué. Seules la copie (repli sans partage natif) et la
 * panne parlent. La zone d'état est présente dès le premier rendu, vide tant
 * qu'il n'y a rien à dire : une région insérée en même temps que son texte
 * n'est pas annoncée de façon fiable.
 */
export function ScenarioShareActions({
  scenario,
  pdf = false,
  className,
}: ScenarioShareActionsProps) {
  const { t, locale, localeTag } = useI18n();
  const settings = useAppStore(s => s.data.settings);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function announce(next: Feedback) {
    setFeedback(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback('idle'), 4000);
  }

  /** Reconstruit à chaque clic : une note saisie entre-temps doit compter. */
  function summaryInput(): ScenarioSummaryInput {
    return {
      scenario,
      settings,
      t,
      locale,
      localeTag,
      appUrl: currentAppUrl(),
    };
  }

  async function handleShare() {
    const result = await shareOrCopy({
      title: buildScenarioShareTitle(scenario, t),
      // PAS d'`url` : `shareOrCopy` ne copie QUE l'url quand elle est fournie
      // et que le partage natif manque — le résumé serait perdu au profit d'un
      // lien vers une app vide. L'adresse vit dans le pied du résumé.
      text: buildScenarioSummaryText(summaryInput()),
    });
    if (result === 'copied') announce('copied');
    else if (result === 'failed') announce('failed');
  }

  async function handlePdf() {
    // Chargé au clic : le générateur PDF ne pèse sur personne tant que
    // personne n'en demande un.
    const { downloadScenarioPdf } = await import('../lib/scenarioPdf.ts');
    announce(downloadScenarioPdf(summaryInput()) ? 'pdfDone' : 'pdfFailed');
  }

  const message = feedback === 'idle' ? '' : t(`share.${feedback}`);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          aria-label={t('share.buttonAria', { name: scenario.name })}
          onClick={() => void handleShare()}
        >
          <Share2 size={16} aria-hidden="true" /> {t('share.button')}
        </Button>
        {pdf && (
          <Button
            variant="secondary"
            aria-label={t('share.pdfButtonAria', { name: scenario.name })}
            onClick={() => void handlePdf()}
          >
            <FileDown size={16} aria-hidden="true" /> {t('share.pdfButton')}
          </Button>
        )}
      </div>
      <p
        role="status"
        className={cn(
          'text-sm font-medium',
          // Pas de marge tant qu'il n'y a rien à dire : la région existe dès le
          // premier rendu, elle ne doit pas creuser un trou pour autant.
          message !== '' && 'mt-2',
          // `--dwc-*` et NON `--mg-good` / `--mg-bad` : l'en-tête d'`index.css`
          // le dit, les tons d'état de la marque sont réglés pour vivre sur un
          // aplat teinté (les pastilles), pas pour être lus en texte plein.
          // Mesuré : #10b981 sur le fond #f7f5ff donne 2,35:1, sous les 4,5:1
          // exigés — axe le refuse. Les variantes lisibles, même teinte,
          // donnent 5,08:1 (succès) et 5,99:1 (erreur) en clair, 9,5:1 et
          // 6,8:1 en sombre.
          feedback === 'failed' || feedback === 'pdfFailed'
            ? 'text-[var(--dwc-danger)]'
            : 'text-[var(--dwc-success)]'
        )}
      >
        {message}
      </p>
    </div>
  );
}
