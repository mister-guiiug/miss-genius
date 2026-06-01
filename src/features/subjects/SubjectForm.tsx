import { useState, type FormEvent } from 'react';
import type { Subject, SubjectColor } from '../../shared/types/domain.ts';
import { SUBJECT_COLORS } from '../../shared/types/domain.ts';
import { SUBJECT_HEX } from '../../shared/lib/colors.ts';
import { cn } from '../../shared/lib/cn.ts';
import { TextField } from '../../shared/components/Field.tsx';
import { Button } from '../../shared/components/Button.tsx';

const ICONS = ['📘', '🔢', '🧪', '🌍', '🖋️', '🎨', '🎵', '⚽', '💻', '🗣️'];

export interface SubjectDraft {
  name: string;
  weight: number;
  color: SubjectColor;
  icon: string;
}

interface SubjectFormProps {
  initial?: Subject;
  onSubmit: (draft: SubjectDraft) => void;
}

export function SubjectForm({ initial, onSubmit }: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [weight, setWeight] = useState(String(initial?.weight ?? 1));
  const [color, setColor] = useState<SubjectColor>(initial?.color ?? 'violet');
  const [icon, setIcon] = useState(initial?.icon ?? '📘');
  const [error, setError] = useState<string>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const w = Number(weight.replace(',', '.'));
    if (!trimmed) return setError('Donne un nom à la matière.');
    if (!(w > 0)) return setError('Le coefficient doit être supérieur à 0.');
    onSubmit({ name: trimmed, weight: w, color, icon });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="Nom de la matière"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Mathématiques"
        autoFocus
        error={error && !name.trim() ? error : undefined}
      />
      <TextField
        label="Coefficient de la matière"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        hint="Poids de la matière dans la moyenne générale."
        error={error && name.trim() ? error : undefined}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">Couleur</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map(c => (
            <button
              key={c}
              type="button"
              aria-label={`Couleur ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cn(
                'h-9 w-9 rounded-full border-2',
                color === c ? 'border-[var(--mg-text)]' : 'border-transparent'
              )}
              style={{ background: SUBJECT_HEX[c] }}
            >
              {color === c && (
                <span aria-hidden="true" className="text-white">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">Icône</legend>
        <div className="flex flex-wrap gap-2">
          {ICONS.map(i => (
            <button
              key={i}
              type="button"
              aria-label={`Icône ${i}`}
              aria-pressed={icon === i}
              onClick={() => setIcon(i)}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-2xl border text-lg',
                icon === i
                  ? 'border-primary bg-primary-soft'
                  : 'border-[var(--mg-border)]'
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </fieldset>

      <Button type="submit" block>
        {initial ? 'Enregistrer' : 'Ajouter la matière'}
      </Button>
    </form>
  );
}
