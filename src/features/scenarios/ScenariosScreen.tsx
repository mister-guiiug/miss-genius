import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore.ts';
import type { Scenario } from '../../shared/types/domain.ts';
import {
  computeSubjectResults,
  generalAverage,
} from '../../shared/lib/average.ts';
import { formatAverage, formatDelta } from '../../shared/lib/format.ts';
import { Card } from '../../shared/components/Card.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { Sheet } from '../../shared/components/Sheet.tsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.tsx';
import { TrendPill } from '../../shared/components/badges.tsx';
import { TextField } from '../../shared/components/Field.tsx';

export function ScenariosScreen() {
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
    const general = (s: Scenario) =>
      generalAverage(computeSubjectResults(s.subjects, s.grades, options));
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
        + Nouveau scénario
      </Button>

      <p className="px-1 text-sm text-[var(--mg-text-soft)]">
        Compare des hypothèses : duplique un scénario, change quelques notes, et
        vois l'écart de moyenne générale par rapport au scénario actif.
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
                          actif
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-[var(--mg-text-soft)]">
                      {scenario.subjects.length} matière
                      {scenario.subjects.length > 1 ? 's' : ''} ·{' '}
                      {scenario.grades.length} note
                      {scenario.grades.length > 1 ? 's' : ''}
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
                      Activer
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => duplicateScenario(scenario.id)}
                  >
                    Dupliquer
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Renommer ${scenario.name}`}
                    onClick={() => {
                      setRenaming(scenario);
                      setRenameValue(scenario.name);
                    }}
                  >
                    Renommer
                  </Button>
                  {scenarios.length > 1 && (
                    <Button
                      variant="ghost"
                      className="text-[var(--mg-bad)]"
                      onClick={() => setToDelete(scenario)}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
                {delta !== null && (
                  <p className="mt-2 text-sm text-[var(--mg-text-soft)]">
                    Écart vs scénario actif :{' '}
                    <strong>{formatDelta(delta)}</strong>
                  </p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={creating}
        title="Nouveau scénario"
        onClose={() => setCreating(false)}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            addScenario(newName.trim() || 'Nouveau scénario');
            setNewName('');
            setCreating(false);
          }}
        >
          <TextField
            label="Nom du scénario"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Si je révise les maths"
            autoFocus
          />
          <Button type="submit" block>
            Créer
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={renaming !== null}
        title="Renommer le scénario"
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
            label="Nom du scénario"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            autoFocus
          />
          <Button type="submit" block>
            Enregistrer
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer le scénario ?"
        message={`« ${toDelete?.name} » sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteScenario(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
