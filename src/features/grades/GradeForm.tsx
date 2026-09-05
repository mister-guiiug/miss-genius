import { useState, type FormEvent } from 'react';
import type { Grade, GradeType, Period } from '../../shared/types/domain.ts';
import { GRADE_TYPES } from '../../shared/types/domain.ts';
import { useI18n } from '../../i18n';
import {
  TextField,
  SelectField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';

export interface GradeDraft {
  value: number;
  max: number;
  weight: number;
  periodId: string;
  date?: string;
  type?: GradeType;
  label?: string;
}

interface GradeFormProps {
  initial?: Grade;
  defaultMax: number;
  /** Périodes disponibles (un sélecteur apparaît s'il y en a plusieurs). */
  periods: Period[];
  /** Période pré-sélectionnée (période active du scénario). */
  defaultPeriodId: string;
  onSubmit: (draft: GradeDraft) => void;
}

export function GradeForm({
  initial,
  defaultMax,
  periods,
  defaultPeriodId,
  onSubmit,
}: GradeFormProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(String(initial?.value ?? ''));
  const [max, setMax] = useState(String(initial?.max ?? defaultMax));
  const [weight, setWeight] = useState(String(initial?.weight ?? 1));
  const [periodId, setPeriodId] = useState(
    initial?.periodId ?? defaultPeriodId
  );
  const [date, setDate] = useState(initial?.date ?? '');
  const [type, setType] = useState<GradeType | ''>(initial?.type ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [error, setError] = useState<string>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = Number(value.replace(',', '.'));
    const m = Number(max.replace(',', '.'));
    const w = Number(weight.replace(',', '.'));
    if (!(m > 0)) return setError(t('grades.form.errorMax'));
    if (!Number.isFinite(v) || v < 0 || v > m)
      return setError(t('grades.form.errorValue', { max: m }));
    if (!(w > 0)) return setError(t('grades.form.errorWeight'));
    onSubmit({
      value: v,
      max: m,
      weight: w,
      periodId,
      date: date || undefined,
      type: type || undefined,
      label: label.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t('grades.form.valueLabel')}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.25"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={t('grades.form.valuePlaceholder')}
        />
        <TextField
          label={t('grades.form.maxLabel')}
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={max}
          onChange={e => setMax(e.target.value)}
        />
      </div>
      <TextField
        label={t('grades.form.weightLabel')}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        error={error}
      />
      <SelectField
        label={t('grades.form.typeLabel')}
        value={type}
        onChange={e => setType(e.target.value as GradeType | '')}
      >
        <option value="">{t('grades.form.typeNone')}</option>
        {GRADE_TYPES.map(gradeType => (
          <option key={gradeType} value={gradeType}>
            {t(`grades.type.${gradeType}`)}
          </option>
        ))}
      </SelectField>
      {periods.length > 1 && (
        <SelectField
          label={t('grades.form.periodLabel')}
          value={periodId}
          onChange={e => setPeriodId(e.target.value)}
        >
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
      )}
      <TextField
        label={t('grades.form.titleLabel')}
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder={t('grades.form.titlePlaceholder')}
      />
      <TextField
        label={t('grades.form.dateLabel')}
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <Button type="submit" block>
        {initial ? t('common.save') : t('grades.form.submitAdd')}
      </Button>
    </form>
  );
}
