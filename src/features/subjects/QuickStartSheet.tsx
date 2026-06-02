import { useMemo, useState } from 'react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { Button } from '../../shared/components/Button.tsx';
import { Sheet } from '../../shared/components/Sheet.tsx';
import { SelectField } from '../../shared/components/Field.tsx';
import { SubjectIcon } from '../../shared/components/SubjectIcon.tsx';
import { SUBJECT_HEX } from '../../shared/lib/colors.ts';
import { subjectNameTaken } from '../../shared/lib/subjectName.ts';
import { CLASS_LEVELS } from './subjectCatalog.ts';

interface QuickStartSheetProps {
  open: boolean;
  onClose: () => void;
  /** Appelé après activation (ex. pour naviguer / fermer). */
  onDone?: () => void;
}

/**
 * Démarrage rapide : l'élève choisit sa classe, on propose les matières
 * correspondantes (toutes cochées par défaut), il active celles qu'il suit.
 */
export function QuickStartSheet({
  open,
  onClose,
  onDone,
}: QuickStartSheetProps) {
  const addSubjects = useAppStore(s => s.addSubjects);
  const existingSubjects = useAppStore(selectActiveScenario).subjects;
  const [classId, setClassId] = useState(CLASS_LEVELS[0]!.id);
  // Indices décochés manuellement (par défaut tout est coché).
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const level = useMemo(
    () => CLASS_LEVELS.find(c => c.id === classId) ?? CLASS_LEVELS[0]!,
    [classId]
  );

  // Matières déjà présentes dans le scénario : verrouillées (anti-doublon).
  const alreadyAdded = useMemo(() => {
    const set = new Set<number>();
    level.subjects.forEach((subject, i) => {
      if (subjectNameTaken(existingSubjects, subject.name)) set.add(i);
    });
    return set;
  }, [level, existingSubjects]);

  function changeClass(id: string) {
    setClassId(id);
    setExcluded(new Set());
  }

  function toggle(index: number) {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const isChecked = (i: number) => !excluded.has(i) && !alreadyAdded.has(i);
  const selectedCount = level.subjects.filter((_, i) => isChecked(i)).length;
  const allAlreadyAdded = alreadyAdded.size === level.subjects.length;

  function activate() {
    const chosen = level.subjects.filter((_, i) => isChecked(i));
    if (chosen.length > 0) addSubjects(chosen);
    onClose();
    onDone?.();
  }

  // Regroupe les classes par cycle pour le <select>.
  const groups = useMemo(() => {
    const map = new Map<string, typeof CLASS_LEVELS>();
    for (const c of CLASS_LEVELS) {
      const list = map.get(c.group) ?? [];
      list.push(c);
      map.set(c.group, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <Sheet open={open} title="Démarrage rapide" onClose={onClose}>
      <p className="mb-4 text-sm text-[var(--mg-text-soft)]">
        Choisis ta classe : on te propose les matières habituelles. Tu pourras
        ajuster coefficients et notes ensuite.
      </p>

      <SelectField
        label="Ma classe"
        value={classId}
        onChange={e => changeClass(e.target.value)}
      >
        {groups.map(([group, levels]) => (
          <optgroup key={group} label={group}>
            {levels.map(c => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>

      <ul className="mt-4 flex flex-col gap-1.5">
        {level.subjects.map((subject, i) => {
          const locked = alreadyAdded.has(i);
          return (
            <li key={`${subject.name}-${i}`}>
              <label
                className={
                  'flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--mg-border)] bg-[var(--mg-surface-2)] px-3 ' +
                  (locked ? 'opacity-60' : 'cursor-pointer')
                }
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-primary)]"
                  checked={isChecked(i)}
                  disabled={locked}
                  onChange={() => toggle(i)}
                />
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                  style={{ background: `${SUBJECT_HEX[subject.color]}1a` }}
                >
                  <SubjectIcon
                    icon={subject.icon}
                    size={17}
                    className="text-[var(--mg-text)]"
                  />
                </span>
                <span className="flex-1 truncate font-semibold">
                  {subject.name}
                </span>
                {locked ? (
                  <span className="text-xs font-semibold text-[var(--mg-text-soft)]">
                    déjà ajoutée
                  </span>
                ) : (
                  <span className="text-xs text-[var(--mg-text-soft)]">
                    coef {subject.weight}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 mt-4 bg-[var(--mg-surface)] pt-2">
        <Button block onClick={activate} disabled={selectedCount === 0}>
          {selectedCount > 0
            ? `Activer ${selectedCount} matière${selectedCount > 1 ? 's' : ''}`
            : allAlreadyAdded
              ? 'Toutes ces matières sont déjà ajoutées'
              : 'Sélectionne au moins une matière'}
        </Button>
      </div>
    </Sheet>
  );
}
