import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { useI18n } from '../../i18n';
import { PERIOD_PRESETS, type PeriodPreset } from '../../shared/lib/periods.ts';
import { Sheet } from '@mister-guiiug/dev-wpa-config/react/sheet';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { TextField } from '@mister-guiiug/dev-wpa-config/react/field';
import { ConfirmDialog } from '@mister-guiiug/dev-wpa-config/react/confirm-dialog';

interface PeriodManagerSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Gestion des périodes : preset, renommage, ajout, suppression. */
export function PeriodManagerSheet({ open, onClose }: PeriodManagerSheetProps) {
  const { t } = useI18n();
  const scenario = useAppStore(selectActiveScenario);
  const renamePeriod = useAppStore(s => s.renamePeriod);
  const addPeriod = useAppStore(s => s.addPeriod);
  const deletePeriod = useAppStore(s => s.deletePeriod);
  const applyPeriodPreset = useAppStore(s => s.applyPeriodPreset);

  const [newName, setNewName] = useState('');
  const [pendingPreset, setPendingPreset] = useState<PeriodPreset | null>(null);

  const hasGrades = scenario.grades.length > 0;

  return (
    <Sheet open={open} title={t('periods.managerTitle')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold">
            {t('periods.modelLabel')}
          </p>
          <div className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map(preset => (
              <Button
                key={preset}
                variant="secondary"
                onClick={() =>
                  hasGrades
                    ? setPendingPreset(preset)
                    : applyPeriodPreset(preset)
                }
              >
                {t(`periods.preset.${preset}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t('periods.myPeriods')}</p>
          {scenario.periods.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                aria-label={t('periods.nameAria', { name: p.name })}
                value={p.name}
                onChange={e => renamePeriod(p.id, e.target.value)}
                className="min-h-11 flex-1 rounded-2xl border border-[var(--mg-border)] bg-[var(--mg-surface-2)] px-4 text-[16px]"
              />
              {scenario.periods.length > 1 && (
                <Button
                  variant="ghost"
                  aria-label={t('periods.deleteAria', { name: p.name })}
                  onClick={() => deletePeriod(p.id)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={e => {
            e.preventDefault();
            if (!newName.trim()) return;
            addPeriod(newName);
            setNewName('');
          }}
        >
          <div className="flex-1">
            <TextField
              label={t('periods.addLabel')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t('periods.addPlaceholder')}
            />
          </div>
          <Button type="submit" aria-label={t('periods.addAria')}>
            <Plus size={18} aria-hidden="true" />
          </Button>
        </form>

        <p className="text-xs text-[var(--mg-text-soft)]">
          {t('periods.deleteNote')}
        </p>
      </div>

      <ConfirmDialog
        open={pendingPreset !== null}
        title={t('periods.changeModelTitle')}
        message={t('periods.changeModelMessage')}
        confirmLabel={t('periods.apply')}
        onCancel={() => setPendingPreset(null)}
        onConfirm={() => {
          if (pendingPreset) applyPeriodPreset(pendingPreset);
          setPendingPreset(null);
        }}
      />
    </Sheet>
  );
}
