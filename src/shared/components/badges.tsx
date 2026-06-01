import { cn } from '../lib/cn.ts';
import { deltaTrend, formatDelta, type Trend } from '../lib/format.ts';

/** Pastille de tendance — ne repose pas que sur la couleur (icône + signe). */
export function TrendPill({ delta }: { delta: number | null }) {
  const trend: Trend = deltaTrend(delta);
  const icon = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '＝';
  const styles: Record<Trend, string> = {
    up: 'bg-[var(--mg-good)]/12 text-[var(--mg-good)]',
    down: 'bg-[var(--mg-bad)]/12 text-[var(--mg-bad)]',
    flat: 'bg-[var(--mg-text-soft)]/12 text-[var(--mg-text-soft)]',
  };
  const wording =
    trend === 'up' ? 'en hausse' : trend === 'down' ? 'en baisse' : 'stable';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        styles[trend]
      )}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{formatDelta(delta)}</span>
      <span className="sr-only">({wording})</span>
    </span>
  );
}

const toneStyles = {
  good: 'bg-[var(--mg-good)]/12 text-[var(--mg-good)]',
  mid: 'bg-[var(--mg-amber)]/15 text-[var(--color-amber)]',
  low: 'bg-[var(--mg-bad)]/12 text-[var(--mg-bad)]',
  none: 'bg-[var(--mg-text-soft)]/12 text-[var(--mg-text-soft)]',
} as const;

export function Tag({
  tone,
  children,
}: {
  tone: keyof typeof toneStyles;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        toneStyles[tone]
      )}
    >
      {children}
    </span>
  );
}
