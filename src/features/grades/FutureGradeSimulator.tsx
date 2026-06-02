import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Scenario, Settings } from '../../shared/types/domain.ts';
import {
  makeHypotheticalGrade,
  simulateFutureGrade,
} from '../../shared/lib/simulate.ts';
import { formatAverage, formatDelta } from '../../shared/lib/format.ts';
import { TrendPill } from '../../shared/components/badges.tsx';
import { Card } from '../../shared/components/Card.tsx';
import { TextField } from '../../shared/components/Field.tsx';

interface Props {
  scenario: Scenario;
  subjectId: string;
  settings: Settings;
}

/** Widget « impact d'une future note » sur la matière et la moyenne générale. */
export function FutureGradeSimulator({ scenario, subjectId, settings }: Props) {
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
        <Sparkles size={18} className="text-primary" aria-hidden="true" /> Et si
        j'avais cette note ?
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <TextField
          label="Note"
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <TextField
          label="Barème"
          type="number"
          inputMode="decimal"
          min="1"
          value={max}
          onChange={e => setMax(e.target.value)}
        />
        <TextField
          label="Coef"
          type="number"
          inputMode="decimal"
          min="0"
          value={weight}
          onChange={e => setWeight(e.target.value)}
        />
      </div>

      {impact === null ? (
        <p className="text-sm text-[var(--mg-bad)]" role="alert">
          Saisis une note valide pour voir l'impact.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3" aria-live="polite">
          <div className="rounded-2xl bg-[var(--mg-surface-2)] p-3">
            <dt className="text-xs text-[var(--mg-text-soft)]">
              Moyenne de la matière
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
              Moyenne générale
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
          Cette note ferait varier ta moyenne générale de{' '}
          <strong>{formatDelta(impact.generalDelta)}</strong> point.
        </p>
      )}
    </Card>
  );
}
