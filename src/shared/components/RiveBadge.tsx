import { memo, Suspense, lazy, useState, type ReactNode } from 'react';

/**
 * Conteneur d'animation Rive **isolé** et **lazy**.
 *
 * Principes (cf. cahier des charges) :
 *  - composant mémoïsé + monté une seule fois -> pas de remount intempestif ;
 *  - conteneur dimensionné explicitement (width/height) ;
 *  - fallback statique systématique si l'asset .riv est absent / échoue / si
 *    l'utilisateur préfère un mouvement réduit ;
 *  - le moteur Rive (@rive-app/react-webgl2) n'est chargé que si une source .riv
 *    est fournie -> aucun coût sur mobile d'entrée de gamme par défaut.
 *
 * Pour activer une vraie animation : déposer un fichier dans `public/rive/` et
 * passer `src="rive/<fichier>.riv"`. Sans cela, le fallback (décoratif) suffit.
 */
const RivePlayer = lazy(() => import('./RivePlayer.tsx'));

interface RiveBadgeProps {
  /** Chemin du .riv (optionnel). Absent -> fallback statique. */
  src?: string;
  stateMachine?: string;
  size?: number;
  /** Visuel statique affiché en fallback (emoji, SVG…). */
  fallback: ReactNode;
  label: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

function RiveBadgeImpl({
  src,
  stateMachine,
  size = 120,
  fallback,
  label,
}: RiveBadgeProps) {
  const [failed, setFailed] = useState(false);
  const reduced = prefersReducedMotion();
  // Sans source .riv, échec runtime, ou mouvement réduit -> fallback statique.
  // On ne charge alors jamais le moteur WebGL (aucun coût sur mobile bas de gamme).
  const useStatic = !src || failed || reduced;

  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
      className="grid place-items-center shrink-0"
    >
      {useStatic ? (
        <div
          className="grid place-items-center text-[56px] mg-pop"
          aria-hidden="true"
        >
          {fallback}
        </div>
      ) : (
        <Suspense fallback={<div aria-hidden="true">{fallback}</div>}>
          <RivePlayer
            src={src!}
            stateMachine={stateMachine}
            size={size}
            onError={() => setFailed(true)}
          />
        </Suspense>
      )}
    </div>
  );
}

export const RiveBadge = memo(RiveBadgeImpl);
