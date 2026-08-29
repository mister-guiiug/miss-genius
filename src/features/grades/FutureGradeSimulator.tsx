import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Scenario, Settings } from '../../shared/types/domain.ts';
import {
  makeHypotheticalGrade,
  simulateFutureGrade,
} from '../../shared/lib/simulate.ts';
import { formatAverage, formatDelta } from '../../shared/lib/format.ts';
import { useI18n } from '../../i18n';
import { TrendPill } from '../../shared/components/badges.tsx';
import { Card } from '../../shared/components/Card.tsx';
import { TextField } from '@mister-guiiug/dev-wpa-config/react/field';

interface Props {
  scenario: Scenario;
  subjectId: string;
  settings: Settings;
}

/** Widget « impact d'une future note » sur la matière et la moyenne générale. */
export function FutureGradeSimulator({ scenario, subjectId, settings }: Props) {
  const { t } = useI18n();
  const [value, setValue] = useState('15');
  const [max, setMax] = useState(String(settings.referenceBase));
  const [weight, setWeight] = useState('1');

  const impact = useMemo(() => {
    const v = Number(value.replace(',', '.'));
    const m = Number(max.replace(',', '.'));
    const w = Number(weight.replace(',', '.'));
    if (!(m > 0) || !(w > 0) || !Number.isFinite(v) || v < 0 || v > m) {
      return null;
    }
    // Impact mesuré sur la période active (notes filtrées en amont).
    const periodGrades = scenario.grades.filter(
      g => g.periodId === scenario.activePeriodId
    );
    return simulateFutureGrade(
      scenario.subjects,
      periodGrades,
      makeHypotheticalGrade(subjectId, v, m, w),
      {
        referenceBase: settings.referenceBase,
        normalizeBases: settings.normalizeBases,
      }
    );
  }, [value, max, weight, scenario, subjectId, settings]);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-bold">
        <Sparkles size={18} className="text-primary" aria-hidden="true" />{' '}
        {t('grades.simulator.title')}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <TextField
          label={t('grades.simulator.gradeLabel')}
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <TextField
          label={t('grades.simulator.maxLabel')}
          type="number"
          inputMode="decimal"
          min="1"
          value={max}
          onChange={e => setMax(e.target.value)}
        />
        <TextField
          label={t('grades.simulator.weightLabel')}
          type="number"
          inputMode="decimal"
          min="0"
          value={weight}
          onChange={e => setWeight(e.target.value)}
        />
      </div>

      {impact === null ? (
        <p className="text-sm text-[var(--mg-bad)]" role="alert">
          {t('grades.simulator.invalid')}
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3" aria-live="polite">
          <div className="rounded-2xl bg-[var(--mg-surface-2)] p-3">
            <dt className="text-xs text-[var(--mg-text-soft)]">
              {t('grades.simulator.subjectAverage')}
            </dt>
            <dd className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tabular-nums">
                {formatAverage(
                  impact.subjectAfter,
                  settings.rounding,
                  settings.referenceBase
                )}
              </span>
              <TrendPill delta={impact.subjectDelta} />
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--mg-surface-2)] p-3">
            <dt className="text-xs text-[var(--mg-text-soft)]">
              {t('dashboard.overallAverage')}
            </dt>
            <dd className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tabular-nums">
                {formatAverage(
                  impact.generalAfter,
                  settings.rounding,
                  settings.referenceBase
                )}
              </span>
              <TrendPill delta={impact.generalDelta} />
            </dd>
          </div>
        </dl>
      )}
      {impact?.generalDelta != null && (
        <p className="text-sm text-[var(--mg-text-soft)]">
          {t('grades.simulator.impact', {
            delta: formatDelta(impact.generalDelta),
          })}
        </p>
      )}
    </Card>
  );
}
