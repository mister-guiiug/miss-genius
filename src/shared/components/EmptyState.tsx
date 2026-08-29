import type { ReactNode } from 'react';
import { EmptyState as BaseEmptyState } from '@mister-guiiug/dev-wpa-config/react/empty-state';
import { RiveBadge } from './RiveBadge.tsx';

interface EmptyStateProps {
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
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
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
