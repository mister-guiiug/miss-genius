import { useState, type FormEvent } from 'react';
import type { Grade, GradeType } from '../../shared/types/domain.ts';
import { GRADE_TYPES } from '../../shared/types/domain.ts';
import { TextField, SelectField } from '../../shared/components/Field.tsx';
import { Button } from '../../shared/components/Button.tsx';

const TYPE_LABELS: Record<GradeType, string> = {
  controle: 'Contrôle',
  'devoir-maison': 'Devoir maison',
  oral: 'Oral',
  examen: 'Examen',
  autre: 'Autre',
};

export interface GradeDraft {
  value: number;
  max: number;
  weight: number;
  date?: string;
  type?: GradeType;
  label?: string;
}

interface GradeFormProps {
  initial?: Grade;
  defaultMax: number;
  onSubmit: (draft: GradeDraft) => void;
}

export function GradeForm({ initial, defaultMax, onSubmit }: GradeFormProps) {
  const [value, setValue] = useState(String(initial?.value ?? ''));
  const [max, setMax] = useState(String(initial?.max ?? defaultMax));
  const [weight, setWeight] = useState(String(initial?.weight ?? 1));
  const [date, setDate] = useState(initial?.date ?? '');
  const [type, setType] = useState<GradeType | ''>(initial?.type ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [error, setError] = useState<string>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = Number(value.replace(',', '.'));
    const m = Number(max.replace(',', '.'));
    const w = Number(weight.replace(',', '.'));
    if (!(m > 0)) return setError('Le barème doit être supérieur à 0.');
    if (!Number.isFinite(v) || v < 0 || v > m)
      return setError(`La note doit être comprise entre 0 et ${m}.`);
    if (!(w > 0)) return setError('Le coefficient doit être supérieur à 0.');
    onSubmit({
      value: v,
      max: m,
      weight: w,
      date: date || undefined,
      type: type || undefined,
      label: label.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Note obtenue"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.25"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="14"
        />
        <TextField
          label="Barème"
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={max}
          onChange={e => setMax(e.target.value)}
        />
      </div>
      <TextField
        label="Coefficient de la note"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        error={error}
      />
      <SelectField
        label="Type d'évaluation (facultatif)"
        value={type}
        onChange={e => setType(e.target.value as GradeType | '')}
      >
        <option value="">Non précisé</option>
        {GRADE_TYPES.map(t => (
          <option key={t} value={t}>
            {TYPE_LABELS[t]}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Intitulé (facultatif)"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Chapitre 3 — fractions"
      />
      <TextField
        label="Date (facultative)"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <Button type="submit" block>
        {initial ? 'Enregistrer' : 'Ajouter la note'}
      </Button>
    </form>
  );
}
