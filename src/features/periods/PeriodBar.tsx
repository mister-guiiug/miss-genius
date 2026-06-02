import { useState } from 'react';
import { CalendarDays, Settings2 } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { cn } from '../../shared/lib/cn.ts';
import { PeriodManagerSheet } from './PeriodManagerSheet.tsx';

/**
 * Barre de sélection de période (segmented control horizontal) + accès au
 * gestionnaire de périodes. À placer en haut des écrans dépendant d'une période.
 */
export function PeriodBar() {
  const scenario = useAppStore(selectActiveScenario);
  const setActivePeriod = useAppStore(s => s.setActivePeriod);
  const [manage, setManage] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <CalendarDays
        size={18}
        className="shrink-0 text-[var(--mg-text-soft)]"
        aria-hidden="true"
      />
      <div
        role="tablist"
        aria-label="Période"
        className="flex flex-1 gap-1 overflow-x-auto"
      >
        {scenario.periods.map(p => {
          const active = p.id === scenario.activePeriodId;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActivePeriod(p.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap',
                active
                  ? 'bg-primary text-white'
                  : 'bg-[var(--mg-surface-2)] text-[var(--mg-text-soft)] border border-[var(--mg-border)]'
              )}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Gérer les périodes"
        onClick={() => setManage(true)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--mg-border)] bg-[var(--mg-surface-2)] text-[var(--mg-text-soft)]"
      >
        <Settings2 size={17} aria-hidden="true" />
      </button>

      <PeriodManagerSheet open={manage} onClose={() => setManage(false)} />
    </div>
  );
}
