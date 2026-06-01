import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { useScenarioResults } from '../../shared/hooks/useScenarioResults.ts';
import type { Subject } from '../../shared/types/domain.ts';
import { Card } from '../../shared/components/Card.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { Sheet } from '../../shared/components/Sheet.tsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.tsx';
import { EmptyState } from '../../shared/components/EmptyState.tsx';
import { SubjectIcon } from '../../shared/components/SubjectIcon.tsx';
import { formatAverage } from '../../shared/lib/format.ts';
import { SUBJECT_HEX } from '../../shared/lib/colors.ts';
import { SubjectForm } from './SubjectForm.tsx';
import { QuickStartSheet } from './QuickStartSheet.tsx';

export function SubjectsScreen() {
  const scenario = useAppStore(selectActiveScenario);
  const settings = useAppStore(s => s.data.settings);
  const addSubject = useAppStore(s => s.addSubject);
  const updateSubject = useAppStore(s => s.updateSubject);
  const deleteSubject = useAppStore(s => s.deleteSubject);
  const { subjectResults } = useScenarioResults(scenario, settings);

  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const [quickStart, setQuickStart] = useState(false);
  const [toDelete, setToDelete] = useState<Subject | null>(null);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-2">
        <Button block onClick={() => setCreating(true)}>
          <Plus size={18} aria-hidden="true" /> Ajouter
        </Button>
        <Button variant="secondary" block onClick={() => setQuickStart(true)}>
          <Sparkles size={18} aria-hidden="true" /> Par classe
        </Button>
      </div>

      {scenario.subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={64} className="text-primary" />}
          title="Aucune matière"
          description="Choisis ta classe pour activer les matières habituelles, ou ajoute-les une par une."
          action={
            <Button block onClick={() => setQuickStart(true)}>
              <Sparkles size={18} aria-hidden="true" /> Démarrage rapide par
              classe
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {subjectResults.map(r => (
            <li key={r.subject.id}>
              <Card className="flex items-center gap-3">
                <Link
                  to={`/subjects/${r.subject.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                    style={{ background: `${SUBJECT_HEX[r.subject.color]}1a` }}
                  >
                    <SubjectIcon
                      icon={r.subject.icon}
                      size={20}
                      className="text-[var(--mg-text)]"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.subject.name}</p>
                    <p className="text-sm text-[var(--mg-text-soft)]">
                      coef {r.subject.weight} ·{' '}
                      {formatAverage(
                        r.average,
                        settings.rounding,
                        settings.referenceBase
                      )}
                    </p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  aria-label={`Modifier ${r.subject.name}`}
                  onClick={() => setEditing(r.subject)}
                >
                  <Pencil size={18} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Supprimer ${r.subject.name}`}
                  onClick={() => setToDelete(r.subject)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={creating}
        title="Nouvelle matière"
        onClose={() => setCreating(false)}
      >
        <SubjectForm
          onSubmit={draft => {
            addSubject(draft);
            setCreating(false);
          }}
        />
      </Sheet>

      <Sheet
        open={editing !== null}
        title="Modifier la matière"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <SubjectForm
            initial={editing}
            onSubmit={draft => {
              updateSubject(editing.id, draft);
              setEditing(null);
            }}
          />
        )}
      </Sheet>

      <QuickStartSheet open={quickStart} onClose={() => setQuickStart(false)} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la matière ?"
        message={`« ${toDelete?.name} » et ses notes seront supprimées de ce scénario.`}
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteSubject(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
