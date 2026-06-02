import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  BookOpen,
  Check,
  GripVertical,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
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
import { cn } from '../../shared/lib/cn.ts';
import { SubjectForm } from './SubjectForm.tsx';
import { QuickStartSheet } from './QuickStartSheet.tsx';

export function SubjectsScreen() {
  const scenario = useAppStore(selectActiveScenario);
  const settings = useAppStore(s => s.data.settings);
  const addSubject = useAppStore(s => s.addSubject);
  const updateSubject = useAppStore(s => s.updateSubject);
  const deleteSubject = useAppStore(s => s.deleteSubject);
  const reorderSubjects = useAppStore(s => s.reorderSubjects);
  const updateSettings = useAppStore(s => s.updateSettings);
  const { subjectResults } = useScenarioResults(scenario, settings);

  // Ordre verrouillé par défaut : le glisser-déposer n'est actif qu'une fois
  // déverrouillé, ce qui évite tout réordonnancement accidentel.
  const locked = settings.lockSubjectOrder;

  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const [quickStart, setQuickStart] = useState(false);
  const [toDelete, setToDelete] = useState<Subject | null>(null);

  // Glisser-déposer : la poignée capture le pointeur, et l'on calcule la
  // position cible en comparant le pointeur au centre vertical de chaque carte.
  const listRef = useRef<HTMLUListElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Mémorise la position verticale de chaque carte pour l'animation FLIP.
  const positionsRef = useRef<Map<string, number>>(new Map());

  // FLIP : après chaque réordonnancement, on fait glisser les cartes déplacées
  // depuis leur ancienne position vers la nouvelle. La carte en cours de drag
  // est exclue (elle doit rester collée au doigt, sans interpolation).
  useLayoutEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const reduce =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<string, number>();
    for (const el of Array.from(ul.children) as HTMLLIElement[]) {
      const id = el.dataset.id;
      if (!id) continue;
      const top = el.getBoundingClientRect().top;
      next.set(id, top);
      const prev = positionsRef.current.get(id);
      if (reduce || prev === undefined || prev === top || id === draggingId) {
        continue;
      }
      // Invert : on replace la carte à son ancienne position, sans transition…
      el.style.transition = 'none';
      el.style.transform = `translateY(${prev - top}px)`;
      // …puis on la laisse rejoindre sa place réelle à la frame suivante (Play).
      requestAnimationFrame(() => {
        el.style.transition = 'transform 180ms ease';
        el.style.transform = '';
      });
    }
    positionsRef.current = next;
  });

  /** Index d'insertion correspondant à la position verticale du pointeur. */
  function indexFromPointer(clientY: number): number {
    const items = listRef.current?.children;
    if (!items) return -1;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i]!.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length - 1;
  }

  function handleDragStart(
    e: ReactPointerEvent<HTMLButtonElement>,
    id: string
  ) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(id);
  }

  function handleDragMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingId) return;
    // Ordre courant lu en direct (évite une fermeture périmée pendant le drag).
    const subjects = selectActiveScenario(useAppStore.getState()).subjects;
    const from = subjects.findIndex(s => s.id === draggingId);
    const to = indexFromPointer(e.clientY);
    if (from !== -1 && to !== -1 && from !== to) reorderSubjects(from, to);
  }

  function handleDragEnd(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDraggingId(null);
  }

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

      {scenario.subjects.length >= 2 && (
        <div className="flex items-center gap-2">
          {!locked && (
            <p className="text-sm text-[var(--mg-text-soft)]">
              Glisse les matières pour les réordonner.
            </p>
          )}
          <Button
            variant={locked ? 'ghost' : 'primary'}
            className="ml-auto"
            aria-pressed={!locked}
            onClick={() => updateSettings({ lockSubjectOrder: !locked })}
          >
            {locked ? (
              <>
                <ArrowUpDown size={16} aria-hidden="true" /> Réorganiser
              </>
            ) : (
              <>
                <Check size={16} aria-hidden="true" /> Terminer
              </>
            )}
          </Button>
        </div>
      )}

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
        <ul ref={listRef} className="flex flex-col gap-2">
          {subjectResults.map(r => (
            <li key={r.subject.id} data-id={r.subject.id}>
              <Card
                className={cn(
                  'flex items-center gap-2 transition-[box-shadow,opacity]',
                  draggingId === r.subject.id &&
                    'opacity-80 shadow-lg ring-2 ring-primary/40'
                )}
              >
                {!locked && (
                  <button
                    type="button"
                    aria-label={`Réordonner ${r.subject.name}`}
                    className="-ml-1 grid h-10 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-[var(--mg-text-soft)] active:cursor-grabbing"
                    onPointerDown={e => handleDragStart(e, r.subject.id)}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerCancel={handleDragEnd}
                  >
                    <GripVertical size={18} aria-hidden="true" />
                  </button>
                )}
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
          existingSubjects={scenario.subjects}
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
            existingSubjects={scenario.subjects}
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
