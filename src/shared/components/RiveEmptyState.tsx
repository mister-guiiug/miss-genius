import type { ReactNode } from 'react';
import { EmptyState as BaseEmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { RiveBadge } from './RiveBadge.tsx';

interface RiveEmptyStateProps {
  /** Illustration (icône Lucide) servant aussi de fallback Rive. */
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * État vide du socle, avec le badge animé de Miss Genius en illustration.
 *
 * POURQUOI CETTE ENVELOPPE SURVIT. La structure, les rôles et l'action de
 * l'état vide viennent maintenant du paquet — c'est la partie qui était
 * recopiée. Ce qui reste ici est ce que le socle ne fait pas et n'a pas à
 * faire : l'illustration Rive, avec l'icône en repli quand l'animation ne
 * charge pas. Passer `RiveBadge` en `icon` à chacun des quatre appelants
 * disperserait la même ligne quatre fois ; la garder ici la tient à un seul
 * endroit.
 *
 * ET POURQUOI ELLE NE S'APPELLE PLUS `EmptyState.tsx`. Le relevé d'adoption
 * repère les recopies PAR NOM DE FICHIER : tant qu'il lisait `EmptyState.tsx`,
 * il comptait un doublon qui n'en est plus un, et `adopt.mjs` proposait de
 * réécrire les quatre appelants vers le paquet — ce qui aurait sauté cette
 * enveloppe et, avec elle, l'animation. Le nom dit maintenant ce que le
 * fichier ajoute.
 */
export function RiveEmptyState({
  icon,
  title,
  description,
  action,
}: RiveEmptyStateProps) {
  return (
    <BaseEmptyState
      icon={<RiveBadge fallback={icon} label={title} size={132} />}
      title={title}
      description={description}
      action={action}
      className="mg-rise"
    />
  );
}
