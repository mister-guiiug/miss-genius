import { Link } from 'react-router-dom';
import { Award, SlidersHorizontal, Target, TrendingUp } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { useScenarioResults } from '../../shared/hooks/useScenarioResults.ts';
import { Card } from '../../shared/components/Card.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { Tag } from '../../shared/components/badges.tsx';
import { EmptyState } from '../../shared/components/EmptyState.tsx';
import { RiveBadge } from '../../shared/components/RiveBadge.tsx';
import { formatAverage } from '../../shared/lib/format.ts';
import { appreciation, SUBJECT_HEX } from '../../shared/lib/colors.ts';

export function DashboardScreen() {
  const scenario = useAppStore(selectActiveScenario);
  const settings = useAppStore(s => s.data.settings);
  const scenarioCount = useAppStore(s => s.data.scenarios.length);
  const { subjectResults, general } = useScenarioResults(scenario, settings);

  if (scenario.subjects.length === 0) {
    return (
      <EmptyState
        emoji="🪄"
        title="Bienvenue dans Miss Genius"
        description="Crée ta première matière pour commencer à simuler tes moyennes."
        action={
          <Link to="/subjects">
            <Button block>Ajouter une matière</Button>
          </Link>
        }
      />
    );
  }

  const ranked = [...subjectResults]
    .filter(r => r.average !== null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const strong = ranked.slice(0, 2).filter(r => (r.average ?? 0) >= 12);
  const weak = ranked
    .slice()
    .reverse()
    .filter(r => (r.average ?? 0) < 10)
    .slice(0, 2);

  const emoji =
    general === null
      ? '📊'
      : general >= 14
        ? '🌟'
        : general >= 10
          ? '🙂'
          : '💪';

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex items-center gap-4 bg-gradient-to-br from-primary to-[color:var(--color-accent)] text-white border-0">
        <RiveBadge
          fallback={emoji}
          label="Niveau de la moyenne générale"
          size={92}
        />
        <div className="min-w-0">
          <p className="text-sm/5 font-medium opacity-90">Moyenne générale</p>
          <p className="font-display text-4xl font-bold tabular-nums">
            {formatAverage(general, settings.rounding, settings.referenceBase)}
          </p>
          <p className="truncate text-sm opacity-90">
            Scénario : {scenario.name}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/scenarios" className="contents">
          <Card className="flex flex-col gap-1">
            <SlidersHorizontal
              size={24}
              className="text-primary"
              aria-hidden="true"
            />
            <span className="font-semibold">Scénarios</span>
            <span className="text-sm text-[var(--mg-text-soft)]">
              {scenarioCount} enregistré{scenarioCount > 1 ? 's' : ''}
            </span>
          </Card>
        </Link>
        <Link to="/goal" className="contents">
          <Card className="flex flex-col gap-1">
            <Target
              size={24}
              className="text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span className="font-semibold">Objectif</span>
            <span className="text-sm text-[var(--mg-text-soft)]">
              {scenario.goal ? 'Défini' : 'À définir'}
            </span>
          </Card>
        </Link>
      </div>

      {(strong.length > 0 || weak.length > 0) && (
        <div className="grid gap-3">
          {strong.length > 0 && (
            <Card>
              <h2 className="mb-2 flex items-center gap-2 font-bold">
                <Award
                  size={18}
                  className="text-[var(--mg-good)]"
                  aria-hidden="true"
                />{' '}
                Tes points forts
              </h2>
              <ul className="flex flex-wrap gap-2">
                {strong.map(r => (
                  <li key={r.subject.id}>
                    <Tag tone="good">
                      {r.subject.name} ·{' '}
                      {formatAverage(
                        r.average,
                        settings.rounding,
                        settings.referenceBase
                      )}
                    </Tag>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {weak.length > 0 && (
            <Card>
              <h2 className="mb-2 flex items-center gap-2 font-bold">
                <TrendingUp
                  size={18}
                  className="text-[var(--color-accent)]"
                  aria-hidden="true"
                />{' '}
                À renforcer en priorité
              </h2>
              <ul className="flex flex-wrap gap-2">
                {weak.map(r => (
                  <li key={r.subject.id}>
                    <Tag tone="low">
                      {r.subject.name} ·{' '}
                      {formatAverage(
                        r.average,
                        settings.rounding,
                        settings.referenceBase
                      )}
                    </Tag>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <section
        aria-labelledby="subjects-heading"
        className="flex flex-col gap-2"
      >
        <h2 id="subjects-heading" className="px-1 font-bold">
          Par matière
        </h2>
        {subjectResults.map(r => {
          const appr = appreciation(r.average);
          return (
            <Link
              key={r.subject.id}
              to={`/subjects/${r.subject.id}`}
              className="contents"
            >
              <Card className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg"
                  style={{ background: `${SUBJECT_HEX[r.subject.color]}1a` }}
                >
                  {r.subject.icon ?? '📘'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.subject.name}</p>
                  <p className="text-sm text-[var(--mg-text-soft)]">
                    {r.gradeCount} note{r.gradeCount > 1 ? 's' : ''} · coef{' '}
                    {r.subject.weight}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold tabular-nums">
                    {formatAverage(
                      r.average,
                      settings.rounding,
                      settings.referenceBase
                    )}
                  </p>
                  <Tag tone={appr.tone}>{appr.label}</Tag>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
