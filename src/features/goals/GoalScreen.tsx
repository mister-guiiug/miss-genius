import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mountain, PartyPopper, Target } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { useI18n } from '../../i18n';
import {
  requiredGradeForSubjectAverage,
  requiredSubjectAverageForGeneral,
  type RequiredReason,
} from '../../shared/lib/simulate.ts';
import { Card } from '@mister-guiiug/dev-wpa-config/react/card';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { RiveEmptyState } from '../../shared/components/RiveEmptyState.tsx';
import {
  TextField,
  SelectField,
} from '@mister-guiiug/dev-wpa-config/react/field';
import { RiveBadge } from '../../shared/components/RiveBadge.tsx';

type Translate = ReturnType<typeof useI18n>['t'];

/** Message pédagogique (icône + texte i18n) selon la faisabilité de l'objectif. */
function reasonMessage(
  reason: RequiredReason,
  base: number,
  t: Translate
): { icon: typeof Target | null; text: string } {
  switch (reason) {
    case 'already-reached':
      return { icon: PartyPopper, text: t('goal.reasonReached') };
    case 'impossible-too-high':
      return { icon: Mountain, text: t('goal.reasonImpossible', { base }) };
    case 'invalid-input':
      return { icon: null, text: t('goal.reasonInvalid') };
    case 'ok':
    default:
      return { icon: null, text: '' };
  }
}

export function GoalScreen() {
  const { t, fmt } = useI18n();
  const scenario = useAppStore(selectActiveScenario);
  const settings = useAppStore(s => s.data.settings);
  const setGoal = useAppStore(s => s.setGoal);
  const clearGoal = useAppStore(s => s.clearGoal);

  const base = settings.referenceBase;
  const options = {
    referenceBase: base,
    normalizeBases: settings.normalizeBases,
  };

  const [scopeKind, setScopeKind] = useState<'general' | 'subject'>(
    scenario.goal?.scope.kind ?? 'general'
  );
  const [subjectId, setSubjectId] = useState(
    scenario.goal?.scope.kind === 'subject'
      ? scenario.goal.scope.subjectId
      : (scenario.subjects[0]?.id ?? '')
  );
  // Matière de la prochaine évaluation (pour un objectif de moyenne générale).
  const [evalSubjectId, setEvalSubjectId] = useState(
    scenario.subjects[0]?.id ?? ''
  );
  const [target, setTarget] = useState(String(scenario.goal?.target ?? 14));
  const [nextWeight, setNextWeight] = useState(
    String(scenario.goal?.nextWeight ?? 1)
  );
  const [nextMax, setNextMax] = useState(String(base));

  const computation = useMemo(() => {
    const tgt = Number(target.replace(',', '.'));
    const w = Number(nextWeight.replace(',', '.'));
    const m = Number(nextMax.replace(',', '.'));
    if (!Number.isFinite(tgt) || !(w > 0) || !(m > 0)) {
      return {
        reason: 'invalid-input' as RequiredReason,
        required: null,
        evalSubjectId,
      };
    }

    // Les objectifs portent sur la période active.
    const periodGrades = scenario.grades.filter(
      g => g.periodId === scenario.activePeriodId
    );

    if (scopeKind === 'subject') {
      const grades = periodGrades.filter(g => g.subjectId === subjectId);
      const r = requiredGradeForSubjectAverage(grades, tgt, w, m, options);
      return {
        reason: r.reason,
        required: r.clamped,
        evalSubjectId: subjectId,
      };
    }

    // Objectif de moyenne générale : on cible une matière précise.
    const subjAvg = requiredSubjectAverageForGeneral(
      scenario.subjects,
      periodGrades,
      evalSubjectId,
      tgt,
      options
    );
    if (subjAvg.reason !== 'ok' || subjAvg.requiredAverage === null) {
      return { reason: subjAvg.reason, required: null, evalSubjectId };
    }
    const grades = periodGrades.filter(g => g.subjectId === evalSubjectId);
    const r = requiredGradeForSubjectAverage(
      grades,
      subjAvg.requiredAverage,
      w,
      m,
      options
    );
    return { reason: r.reason, required: r.clamped, evalSubjectId };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scopeKind,
    subjectId,
    evalSubjectId,
    target,
    nextWeight,
    nextMax,
    scenario,
    settings,
  ]);

  if (scenario.subjects.length === 0) {
    return (
      <RiveEmptyState
        icon={<Target size={64} className="text-primary" />}
        title={t('goal.emptyTitle')}
        description={t('goal.emptyDescription')}
        action={
          <Link to="/subjects">
            <Button block>{t('goal.addSubject')}</Button>
          </Link>
        }
      />
    );
  }

  const message = reasonMessage(computation.reason, base, t);
  const targetSubjectName =
    scenario.subjects.find(s => s.id === computation.evalSubjectId)?.name ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex items-center gap-4 bg-gradient-to-br from-[color:var(--color-accent)] to-primary text-white border-0">
        <RiveBadge
          fallback={<Target size={44} className="text-white" />}
          label={t('goal.badgeLabel')}
          size={84}
        />
        <div>
          <p className="text-sm font-medium opacity-90">{t('goal.myGoal')}</p>
          <p className="font-display text-2xl font-bold">
            {t('goal.question', { target: target || '…', base })}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <SelectField
          label={t('goal.typeLabel')}
          value={scopeKind}
          onChange={e => setScopeKind(e.target.value as 'general' | 'subject')}
        >
          <option value="general">{t('goal.typeGeneral')}</option>
          <option value="subject">{t('goal.typeSubject')}</option>
        </SelectField>

        {scopeKind === 'subject' ? (
          <SelectField
            label={t('goal.targetSubjectLabel')}
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
          >
            {scenario.subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        ) : (
          <SelectField
            label={t('goal.evalSubjectLabel')}
            value={evalSubjectId}
            onChange={e => setEvalSubjectId(e.target.value)}
            hint={t('goal.evalSubjectHint')}
          >
            {scenario.subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        )}

        <TextField
          label={t('goal.targetLabel', { base })}
          type="number"
          inputMode="decimal"
          min="0"
          max={String(base)}
          step="0.5"
          value={target}
          onChange={e => setTarget(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t('goal.nextWeightLabel')}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={nextWeight}
            onChange={e => setNextWeight(e.target.value)}
          />
          <TextField
            label={t('goal.nextMaxLabel')}
            type="number"
            inputMode="decimal"
            min="1"
            value={nextMax}
            onChange={e => setNextMax(e.target.value)}
          />
        </div>
      </Card>

      <Card className="text-center" aria-live="polite">
        {computation.reason === 'ok' && computation.required !== null ? (
          <>
            <p className="text-sm text-[var(--mg-text-soft)]">
              {t('goal.requiredIn', { subject: targetSubjectName })}
            </p>
            <p className="font-display text-5xl font-bold text-primary tabular-nums mg-pop">
              {fmt.number(computation.required, {
                maximumFractionDigits: 2,
              })}
              <span className="text-2xl text-[var(--mg-text-soft)]">
                /{nextMax}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--mg-text-soft)]">
              {t('goal.toAim', { target, base })}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-2 py-4">
            {message.icon && (
              <message.icon
                size={32}
                className="text-[var(--color-accent)]"
                aria-hidden="true"
              />
            )}
            <p className="text-[15px] font-medium">{message.text}</p>
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button
          block
          onClick={() =>
            setGoal({
              scope:
                scopeKind === 'general'
                  ? { kind: 'general' }
                  : { kind: 'subject', subjectId },
              target: Number(target.replace(',', '.')),
              nextWeight: Number(nextWeight.replace(',', '.')) || 1,
            })
          }
        >
          {t('goal.save')}
        </Button>
        {scenario.goal && (
          <Button variant="secondary" onClick={clearGoal}>
            {t('goal.clear')}
          </Button>
        )}
      </div>
    </div>
  );
}
