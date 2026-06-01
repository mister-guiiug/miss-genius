import type { ReactNode } from 'react';
import { RiveBadge } from './RiveBadge.tsx';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/** État vide utile : illustration (Rive ou fallback), message, action claire. */
export function EmptyState({
  emoji,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center mg-rise">
      <RiveBadge fallback={emoji} label={title} size={132} />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="max-w-xs text-[15px] text-[var(--mg-text-soft)]">
        {description}
      </p>
      {action && <div className="mt-2 w-full max-w-xs">{action}</div>}
    </div>
  );
}
