import { useState } from 'react';
import { Brain, GraduationCap, Target, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button } from '../../shared/components/Button.tsx';
import { RiveBadge } from '../../shared/components/RiveBadge.tsx';

interface Step {
  Icon: LucideIcon;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    Icon: Brain,
    title: 'Bienvenue dans Miss Genius',
    text: 'Simule tes moyennes scolaires, teste des hypothèses et garde le cap sur tes objectifs.',
  },
  {
    Icon: GraduationCap,
    title: 'Tes matières, tes notes',
    text: 'Ajoute des matières avec leurs coefficients, saisis tes notes : la moyenne se calcule toute seule.',
  },
  {
    Icon: Target,
    title: 'Vise une moyenne',
    text: 'Fixe un objectif et découvre la note qu’il te faut à la prochaine évaluation. 100% hors ligne.',
  },
];

/** Onboarding très court (3 écrans), illustration Rive avec fallback statique. */
export function Onboarding() {
  const complete = useAppStore(s => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between gap-6 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <RiveBadge
          fallback={<current.Icon size={76} className="text-primary" />}
          label={current.title}
          size={168}
        />
        <h1 className="font-display text-2xl font-bold">{current.title}</h1>
        <p className="max-w-sm text-[15px] text-[var(--mg-text-soft)]">
          {current.text}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
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
          {isLast ? 'Commencer' : 'Suivant'}
        </Button>
        {!isLast && (
          <Button variant="ghost" block onClick={complete}>
            Passer
          </Button>
        )}
      </div>
    </div>
  );
}
