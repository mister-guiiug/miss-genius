import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import type { Subject, SubjectColor } from '../../shared/types/domain.ts';
import { SUBJECT_COLORS } from '../../shared/types/domain.ts';
import { useI18n } from '../../i18n';
import { SUBJECT_HEX } from '../../shared/lib/colors.ts';
import { cn } from '../../shared/lib/cn.ts';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { SubjectIcon } from '../../shared/components/SubjectIcon.tsx';
import {
  DEFAULT_SUBJECT_ICON,
  SUBJECT_ICON_KEYS,
} from '../../shared/lib/subjectIcons.ts';
import { subjectNameTaken } from '../../shared/lib/subjectName.ts';

export interface SubjectDraft {
  name: string;
  weight: number;
  color: SubjectColor;
  icon: string;
}

interface SubjectFormProps {
  initial?: Subject;
  /** Matières déjà présentes dans le scénario (pour bloquer les doublons de nom). */
  existingSubjects: Subject[];
  onSubmit: (draft: SubjectDraft) => void;
}

export function SubjectForm({
  initial,
  existingSubjects,
  onSubmit,
}: SubjectFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [weight, setWeight] = useState(String(initial?.weight ?? 1));
  const [color, setColor] = useState<SubjectColor>(initial?.color ?? 'violet');
  const [icon, setIcon] = useState<string>(
    initial?.icon ?? DEFAULT_SUBJECT_ICON
  );
  const [nameError, setNameError] = useState<string>();
  const [weightError, setWeightError] = useState<string>();

  function submit(e: FormEvent) {
    e.preventDefault();
    setNameError(undefined);
    setWeightError(undefined);
    const trimmed = name.trim();
    const w = Number(weight.replace(',', '.'));

    let valid = true;
    if (!trimmed) {
      setNameError(t('subjects.form.errorNameRequired'));
      valid = false;
    } else if (subjectNameTaken(existingSubjects, trimmed, initial?.id)) {
      setNameError(t('subjects.form.errorNameTaken'));
      valid = false;
    }
    if (!(w > 0)) {
      setWeightError(t('subjects.form.errorWeight'));
      valid = false;
    }
    if (!valid) return;

    onSubmit({ name: trimmed, weight: w, color, icon });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <TextField
        label={t('subjects.form.nameLabel')}
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={t('subjects.form.namePlaceholder')}
        autoFocus
        error={nameError}
      />
      <TextField
        label={t('subjects.form.weightLabel')}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        hint={t('subjects.form.weightHint')}
        error={weightError}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">
          {t('subjects.form.colorLegend')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map(c => (
            <button
              key={c}
              type="button"
              aria-label={t('subjects.form.colorAria', { color: c })}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cn(
                'grid h-9 w-9 place-items-center rounded-full border-2',
                color === c ? 'border-[var(--mg-text)]' : 'border-transparent'
              )}
              style={{ background: SUBJECT_HEX[c] }}
            >
              {color === c && (
                <Check size={16} className="text-white" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">
          {t('subjects.form.iconLegend')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_ICON_KEYS.map(key => (
            <button
              key={key}
              type="button"
              aria-label={t('subjects.form.iconAria', { icon: key })}
              aria-pressed={icon === key}
              onClick={() => setIcon(key)}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-2xl border',
                icon === key
                  ? 'border-primary bg-primary-soft'
                  : 'border-[var(--mg-border)]'
              )}
            >
              <SubjectIcon
                icon={key}
                size={20}
                className="text-[var(--mg-text)]"
              />
            </button>
          ))}
        </div>
      </fieldset>

      <Button type="submit" block>
        {initial ? t('common.save') : t('subjects.form.submitAdd')}
      </Button>
    </form>
  );
}
