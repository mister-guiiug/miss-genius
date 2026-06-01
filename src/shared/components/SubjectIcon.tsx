import { createElement } from 'react';
import { resolveSubjectIcon } from '../lib/subjectIcons.ts';

interface SubjectIconProps {
  icon: string | undefined;
  size?: number;
  className?: string;
}

/**
 * Rend l'icône Lucide d'une matière (décorative -> aria-hidden).
 * `createElement` plutôt que `<Icon/>` : évite que l'icône résolue
 * dynamiquement soit vue comme un composant créé pendant le rendu.
 */
export function SubjectIcon({ icon, size = 20, className }: SubjectIconProps) {
  return createElement(resolveSubjectIcon(icon), {
    size,
    className,
    'aria-hidden': 'true',
  });
}
