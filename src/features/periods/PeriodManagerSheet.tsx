import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import {
  PERIOD_PRESETS,
  PERIOD_PRESET_LABELS,
  type PeriodPreset,
} from '../../shared/lib/periods.ts';
import { Sheet } from '../../shared/components/Sheet.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { TextField } from '../../shared/components/Field.tsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.tsx';

interface PeriodManagerSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Gestion des périodes : preset, renommage, ajout, suppression. */
export function PeriodManagerSheet({ open, onClose }: PeriodManagerSheetProps) {
  const scenario = useAppStore(selectActiveScenario);
  const renamePeriod = useAppStore(s => s.renamePeriod);
  const addPeriod = useAppStore(s => s.addPeriod);
  const deletePeriod = useAppStore(s => s.deletePeriod);
  const applyPeriodPreset = useAppStore(s => s.applyPeriodPreset);

  const [newName, setNewName] = useState('');
  const [pendingPreset, setPendingPreset] = useState<PeriodPreset | null>(null);

  const hasGrades = scenario.grades.length > 0;

  return (
    <Sheet open={open} title="Périodes" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold">Modèle</p>
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
                {PERIOD_PRESET_LABELS[preset]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Mes périodes</p>
          {scenario.periods.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                aria-label={`Nom de la période ${p.name}`}
                value={p.name}
                onChange={e => renamePeriod(p.id, e.target.value)}
                className="min-h-11 flex-1 rounded-2xl border border-[var(--mg-border)] bg-[var(--mg-surface-2)] px-4 text-[16px]"
              />
              {scenario.periods.length > 1 && (
                <Button
                  variant="ghost"
                  aria-label={`Supprimer la période ${p.name}`}
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
              label="Ajouter une période"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Trimestre 4, Rattrapage…"
            />
          </div>
          <Button type="submit" aria-label="Ajouter la période">
            <Plus size={18} aria-hidden="true" />
          </Button>
        </form>

        <p className="text-xs text-[var(--mg-text-soft)]">
          Supprimer une période rattache ses notes à la première période
          restante (aucune note n'est perdue).
        </p>
      </div>

      <ConfirmDialog
        open={pendingPreset !== null}
        title="Changer le modèle de périodes ?"
        message="Toutes les notes existantes seront regroupées dans la première période du nouveau modèle. Tu pourras les réaffecter ensuite."
        confirmLabel="Appliquer"
        onCancel={() => setPendingPreset(null)}
        onConfirm={() => {
          if (pendingPreset) applyPeriodPreset(pendingPreset);
          setPendingPreset(null);
        }}
      />
    </Sheet>
  );
}
