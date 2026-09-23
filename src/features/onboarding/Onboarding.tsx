import { useState } from 'react';
import {
  Brain,
  Check,
  GraduationCap,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { useI18n } from '../../i18n';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';
import { RiveBadge } from '../../shared/components/RiveBadge.tsx';

interface Step {
  Icon: LucideIcon;
  /** Préfixe de clé i18n : `onboarding.<key>Title` / `onboarding.<key>Text`. */
  key: 'step1' | 'step2' | 'step3';
}

const STEPS: Step[] = [
  { Icon: Brain, key: 'step1' },
  { Icon: GraduationCap, key: 'step2' },
  { Icon: Target, key: 'step3' },
];

/** Ce que fait l'app, en trois lignes, sous le premier écran seulement. */
const HIGHLIGHTS = ['highlight1', 'highlight2', 'highlight3'] as const;

/** Onboarding très court (3 écrans), illustration Rive avec fallback statique. */
export function Onboarding() {
  /*
   * L'ÉCRAN D'ENTRÉE EST UNE VUE DE PAGE, et c'est ici qu'elle se déclare.
   *
   * `usePageViews` vit dans `Shell`, qui n'existe qu'une fois l'onboarding
   * franchi — et avant lui il n'y a même pas de routeur. Mesuré en production
   * le 16/09/2026, socle 4.20.0 en place : consentement accordé, bandeau parti,
   * ZÉRO vue. Un visiteur qui arrive, regarde et repart ne comptait pas.
   *
   * La vue est déclarée par l'écran plutôt que par une condition posée
   * au-dessus de la porte : une condition dupliquée finit par diverger de la
   * porte qu'elle imite.
   */
  usePageViews('/onboarding');
  const { t } = useI18n();
  const complete = useAppStore(s => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;
  const title = t(`onboarding.${current.key}Title`);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between gap-6 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <RiveBadge
          fallback={<current.Icon size={76} className="text-primary" />}
          label={title}
          size={168}
        />
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="max-w-sm text-[15px] text-[var(--mg-text-soft)]">
          {t(`onboarding.${current.key}Text`)}
        </p>
        {/*
          LE PREMIER ÉCRAN DOIT SE SUFFIRE. C'est le seul que voit un visiteur
          qui ne touche à rien, et le seul que lit un moteur : relevé du
          23/09/2026 dans un navigateur vierge, 39 mots en tout, sans un mot
          des coefficients, des trimestres ni de la note à viser. Les deux
          écrans suivants détaillent ; celui-ci résume.
        */}
        {step === 0 && (
          <ul className="flex max-w-sm flex-col gap-2 text-left text-[15px]">
            {HIGHLIGHTS.map(key => (
              <li key={key} className="flex items-start gap-2">
                <Check
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{t(`onboarding.${key}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <p className="text-center text-sm text-[var(--mg-text-soft)]">
          {t('onboarding.promise')}
        </p>
        <div className="flex justify-center gap-2" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={
                'h-2 rounded-full transition-all ' +
                (i === step ? 'w-6 bg-primary' : 'w-2 bg-[var(--mg-border)]')
              }
            />
          ))}
        </div>
        <Button block onClick={() => (isLast ? complete() : setStep(step + 1))}>
          {isLast ? t('onboarding.start') : t('onboarding.next')}
        </Button>
        {!isLast && (
          <Button variant="ghost" block onClick={complete}>
            {t('onboarding.skip')}
          </Button>
        )}
      </div>
    </div>
  );
}
