import { useMemo, useState } from 'react';
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { useI18n, plural } from '../../i18n';
import type { Scenario } from '../../shared/types/domain.ts';
import {
  computeSubjectResults,
  generalAverage,
} from '../../shared/lib/average.ts';
import { formatAverage, formatDelta } from '../../shared/lib/format.ts';
import { Card } from '../../shared/components/Card.tsx';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { Sheet } from '@mister-guiiug/dev-wpa-config/react/sheet';
import { ConfirmDialog } from '@mister-guiiug/dev-wpa-config/react/confirm-dialog';
import { TrendPill } from '../../shared/components/badges.tsx';
import { TextField } from '@mister-guiiug/dev-wpa-config/react/field';

export function ScenariosScreen() {
  const { t, locale } = useI18n();
  const scenarios = useAppStore(s => s.data.scenarios);
  const activeId = useAppStore(s => s.data.activeScenarioId);
  const settings = useAppStore(s => s.data.settings);
  const setActive = useAppStore(s => s.setActiveScenario);
  const addScenario = useAppStore(s => s.addScenario);
  const duplicateScenario = useAppStore(s => s.duplicateScenario);
  const renameScenario = useAppStore(s => s.renameScenario);
  const deleteScenario = useAppStore(s => s.deleteScenario);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<Scenario | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [toDelete, setToDelete] = useState<Scenario | null>(null);

  const options = {
    referenceBase: settings.referenceBase,
    normalizeBases: settings.normalizeBases,
  };

  /** Moyenne générale de chaque scénario + écart vs scénario actif (comparaison). */
  const rows = useMemo(() => {
    // Comparaison sur la période active de chaque scénario.
    const general = (s: Scenario) =>
      generalAverage(
        computeSubjectResults(
          s.subjects,
          s.grades.filter(g => g.periodId === s.activePeriodId),
          options
        )
      );
    const active = scenarios.find(s => s.id === activeId);
    const baseAvg = active ? general(active) : null;
    return scenarios.map(s => {
      const avg = general(s);
      const delta =
        avg !== null && baseAvg !== null && s.id !== activeId
          ? avg - baseAvg
          : null;
      return { scenario: s, average: avg, delta };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios, activeId, settings]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button block onClick={() => setCreating(true)}>
        <Plus size={18} aria-hidden="true" /> {t('scenarios.newButton')}
      </Button>

      <p className="px-1 text-sm text-[var(--mg-text-soft)]">
        {t('scenarios.intro')}
      </p>

      <ul className="flex flex-col gap-2">
        {rows.map(({ scenario, average, delta }) => {
          const isActive = scenario.id === activeId;
          return (
            <li key={scenario.id}>
              <Card className={isActive ? 'border-primary' : undefined}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-semibold">
                      {scenario.name}
                      {isActive && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                          {t('scenarios.active')}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-[var(--mg-text-soft)]">
                      {t(
                        `common.subjectCount.${plural(locale, scenario.subjects.length)}`,
                        { count: scenario.subjects.length }
                      )}{' '}
                      ·{' '}
                      {t(
                        `common.gradeCount.${plural(locale, scenario.grades.length)}`,
                        { count: scenario.grades.length }
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold tabular-nums">
                      {formatAverage(
                        average,
                        settings.rounding,
                        settings.referenceBase
                      )}
                    </p>
                    {delta !== null && <TrendPill delta={delta} />}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isActive && (
                    <Button
                      variant="secondary"
                      onClick={() => setActive(scenario.id)}
                    >
                      <Check size={16} aria-hidden="true" />{' '}
                      {t('scenarios.activate')}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => duplicateScenario(scenario.id)}
                  >
                    <Copy size={16} aria-hidden="true" />{' '}
                    {t('scenarios.duplicate')}
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={t('scenarios.renameAria', {
                      name: scenario.name,
                    })}
                    onClick={() => {
                      setRenaming(scenario);
                      setRenameValue(scenario.name);
                    }}
                  >
                    <Pencil size={16} aria-hidden="true" />{' '}
                    {t('scenarios.rename')}
                  </Button>
                  {scenarios.length > 1 && (
                    <Button
                      variant="ghost"
                      className="text-[var(--mg-bad)]"
                      onClick={() => setToDelete(scenario)}
                    >
                      <Trash2 size={16} aria-hidden="true" />{' '}
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
                {delta !== null && (
                  <p className="mt-2 text-sm text-[var(--mg-text-soft)]">
                    {t('scenarios.delta')} <strong>{formatDelta(delta)}</strong>
                  </p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={creating}
        title={t('scenarios.newTitle')}
        onClose={() => setCreating(false)}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            addScenario(newName.trim() || t('scenarios.defaultName'));
            setNewName('');
            setCreating(false);
          }}
        >
          <TextField
            label={t('scenarios.nameLabel')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t('scenarios.namePlaceholder')}
            autoFocus
          />
          <Button type="submit" block>
            {t('common.create')}
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={renaming !== null}
        title={t('scenarios.renameTitle')}
        onClose={() => setRenaming(null)}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            if (renaming)
              renameScenario(renaming.id, renameValue.trim() || renaming.name);
            setRenaming(null);
          }}
        >
          <TextField
            label={t('scenarios.nameLabel')}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            autoFocus
          />
          <Button type="submit" block>
            {t('common.save')}
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title={t('scenarios.deleteTitle')}
        message={t('scenarios.deleteMessage', { name: toDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteScenario(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
