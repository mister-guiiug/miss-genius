import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NotebookPen, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { useScenarioResults } from '../../shared/hooks/useScenarioResults.ts';
import type { Grade } from '../../shared/types/domain.ts';
import { Card } from '../../shared/components/Card.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { Sheet } from '../../shared/components/Sheet.tsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.tsx';
import { EmptyState } from '../../shared/components/EmptyState.tsx';
import { SubjectIcon } from '../../shared/components/SubjectIcon.tsx';
import { formatAverage } from '../../shared/lib/format.ts';
import { normalizeValue } from '../../shared/lib/average.ts';
import { sortGrades } from '../../shared/lib/sortGrades.ts';
import { SUBJECT_HEX } from '../../shared/lib/colors.ts';
import { PeriodBar } from '../periods/PeriodBar.tsx';
import { GradeForm } from './GradeForm.tsx';
import { FutureGradeSimulator } from './FutureGradeSimulator.tsx';

export function SubjectDetailScreen() {
  const { subjectId = '' } = useParams();
  const scenario = useAppStore(selectActiveScenario);
  const settings = useAppStore(s => s.data.settings);
  const addGrade = useAppStore(s => s.addGrade);
  const updateGrade = useAppStore(s => s.updateGrade);
  const deleteGrade = useAppStore(s => s.deleteGrade);
  const { subjectResults } = useScenarioResults(scenario, settings);

  const result = subjectResults.find(r => r.subject.id === subjectId);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [toDelete, setToDelete] = useState<Grade | null>(null);

  if (!result) {
    return (
      <EmptyState
        icon={<SearchX size={64} className="text-primary" />}
        title="Matière introuvable"
        description="Cette matière n'existe pas dans le scénario actif."
        action={
          <Link to="/subjects">
            <Button block>Retour aux matières</Button>
          </Link>
        }
      />
    );
  }

  const { subject, average } = result;
  const grades = sortGrades(
    scenario.grades.filter(
      g => g.subjectId === subjectId && g.periodId === scenario.activePeriodId
    ),
    settings.gradeSort
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <PeriodBar />

      <Card className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
          style={{ background: `${SUBJECT_HEX[subject.color]}1a` }}
        >
          <SubjectIcon
            icon={subject.icon}
            size={26}
            className="text-[var(--mg-text)]"
          />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">{subject.name}</h1>
          <p className="text-sm text-[var(--mg-text-soft)]">
            coef {subject.weight}
          </p>
        </div>
        <p className="font-display text-2xl font-bold tabular-nums">
          {formatAverage(average, settings.rounding, settings.referenceBase)}
        </p>
      </Card>

      <Button block onClick={() => setCreating(true)}>
        <Plus size={18} aria-hidden="true" /> Ajouter une note
      </Button>

      {grades.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={64} className="text-primary" />}
          title="Aucune note"
          description="Ajoute une première note pour calculer ta moyenne dans cette matière."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {grades.map(g => (
            <li key={g.id}>
              <Card className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft font-display font-bold text-primary tabular-nums">
                  {g.value}
                  <span className="text-[10px] font-medium opacity-70">
                    /{g.max}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {g.label ?? g.type ?? 'Note'}
                  </p>
                  <p className="text-sm text-[var(--mg-text-soft)]">
                    coef {g.weight}
                    {g.max !== settings.referenceBase &&
                      ` · soit ${normalizeValue(g.value, g.max, settings.referenceBase).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}/${settings.referenceBase}`}
                    {g.date && ` · ${g.date}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  aria-label="Modifier la note"
                  onClick={() => setEditing(g)}
                >
                  <Pencil size={18} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Supprimer la note"
                  onClick={() => setToDelete(g)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <FutureGradeSimulator
        scenario={scenario}
        subjectId={subjectId}
        settings={settings}
      />

      <Sheet
        open={creating}
        title="Nouvelle note"
        onClose={() => setCreating(false)}
      >
        <GradeForm
          defaultMax={settings.referenceBase}
          periods={scenario.periods}
          defaultPeriodId={scenario.activePeriodId}
          onSubmit={draft => {
            addGrade({ subjectId, ...draft });
            setCreating(false);
          }}
        />
      </Sheet>

      <Sheet
        open={editing !== null}
        title="Modifier la note"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <GradeForm
            initial={editing}
            defaultMax={settings.referenceBase}
            periods={scenario.periods}
            defaultPeriodId={scenario.activePeriodId}
            onSubmit={draft => {
              updateGrade(editing.id, draft);
              setEditing(null);
            }}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la note ?"
        message="Cette note sera définitivement retirée de la matière."
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteGrade(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
