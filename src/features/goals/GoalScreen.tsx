import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mountain, PartyPopper, Target } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import {
  requiredGradeForSubjectAverage,
  requiredSubjectAverageForGeneral,
  type RequiredReason,
} from '../../shared/lib/simulate.ts';
import { Card } from '../../shared/components/Card.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { EmptyState } from '../../shared/components/EmptyState.tsx';
import { TextField, SelectField } from '../../shared/components/Field.tsx';
import { RiveBadge } from '../../shared/components/RiveBadge.tsx';

/** Message pédagogique selon la faisabilité mathématique de l'objectif. */
function reasonMessage(
  reason: RequiredReason,
  base: number
): { icon: typeof Target | null; text: string } {
  switch (reason) {
    case 'already-reached':
      return {
        icon: PartyPopper,
        text: 'Bonne nouvelle : ton objectif est déjà atteint, même sans nouvelle note décisive.',
      };
    case 'impossible-too-high':
      return {
        icon: Mountain,
        text: `En une seule évaluation, l'objectif n'est pas atteignable (il faudrait dépasser ${base}). Vise-le sur plusieurs notes ou ajuste-le.`,
      };
    case 'invalid-input':
      return {
        icon: null,
        text: 'Renseigne un objectif et un coefficient valides.',
      };
    case 'ok':
    default:
      return { icon: null, text: '' };
  }
}

export function GoalScreen() {
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
    const t = Number(target.replace(',', '.'));
    const w = Number(nextWeight.replace(',', '.'));
    const m = Number(nextMax.replace(',', '.'));
    if (!Number.isFinite(t) || !(w > 0) || !(m > 0)) {
      return {
        reason: 'invalid-input' as RequiredReason,
        required: null,
        evalSubjectId,
      };
    }

    if (scopeKind === 'subject') {
      const grades = scenario.grades.filter(g => g.subjectId === subjectId);
      const r = requiredGradeForSubjectAverage(grades, t, w, m, options);
      return {
        reason: r.reason,
        required: r.clamped,
        evalSubjectId: subjectId,
      };
    }

    // Objectif de moyenne générale : on cible une matière précise.
    const subjAvg = requiredSubjectAverageForGeneral(
      scenario.subjects,
      scenario.grades,
      evalSubjectId,
      t,
      options
    );
    if (subjAvg.reason !== 'ok' || subjAvg.requiredAverage === null) {
      return { reason: subjAvg.reason, required: null, evalSubjectId };
    }
    const grades = scenario.grades.filter(g => g.subjectId === evalSubjectId);
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
      <EmptyState
        icon={<Target size={64} className="text-primary" />}
        title="Pas encore d'objectif possible"
        description="Ajoute des matières et des notes pour fixer un objectif et savoir ce qu'il te faut."
        action={
          <Link to="/subjects">
            <Button block>Ajouter une matière</Button>
          </Link>
        }
      />
    );
  }

  const message = reasonMessage(computation.reason, base);
  const targetSubjectName =
    scenario.subjects.find(s => s.id === computation.evalSubjectId)?.name ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex items-center gap-4 bg-gradient-to-br from-[color:var(--color-accent)] to-primary text-white border-0">
        <RiveBadge
          fallback={<Target size={44} className="text-white" />}
          label="Objectif"
          size={84}
        />
        <div>
          <p className="text-sm font-medium opacity-90">Mon objectif</p>
          <p className="font-display text-2xl font-bold">
            Que me faut-il pour atteindre {target || '…'}/{base} ?
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <SelectField
          label="Type d'objectif"
          value={scopeKind}
          onChange={e => setScopeKind(e.target.value as 'general' | 'subject')}
        >
          <option value="general">Moyenne générale</option>
          <option value="subject">Une matière précise</option>
        </SelectField>

        {scopeKind === 'subject' ? (
          <SelectField
            label="Matière visée"
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
            label="Matière de la prochaine évaluation"
            value={evalSubjectId}
            onChange={e => setEvalSubjectId(e.target.value)}
            hint="C'est dans cette matière que la note nécessaire est calculée."
          >
            {scenario.subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        )}

        <TextField
          label={`Moyenne cible (sur ${base})`}
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
            label="Coef. prochaine éval."
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={nextWeight}
            onChange={e => setNextWeight(e.target.value)}
          />
          <TextField
            label="Barème prochaine éval."
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
              Note nécessaire en {targetSubjectName}
            </p>
            <p className="font-display text-5xl font-bold text-primary tabular-nums mg-pop">
              {computation.required.toLocaleString('fr-FR', {
                maximumFractionDigits: 2,
              })}
              <span className="text-2xl text-[var(--mg-text-soft)]">
                /{nextMax}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--mg-text-soft)]">
              … pour viser {target}/{base}.
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
          Enregistrer l'objectif
        </Button>
        {scenario.goal && (
          <Button variant="secondary" onClick={clearGoal}>
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
}
