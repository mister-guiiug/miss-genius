import { Link } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Dumbbell,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { useI18n, plural } from '../../i18n';
import { useScenarioResults } from '../../shared/hooks/useScenarioResults.ts';
import { Card } from '@mister-guiiug/dev-wpa-config/react/card';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { Tag } from '../../shared/components/badges.tsx';
import { RiveEmptyState } from '../../shared/components/RiveEmptyState.tsx';
import { RiveBadge } from '../../shared/components/RiveBadge.tsx';
import { SubjectIcon } from '../../shared/components/SubjectIcon.tsx';
import { PeriodBar } from '../periods/PeriodBar.tsx';
import { formatAverage } from '../../shared/lib/format.ts';
import { appreciation, SUBJECT_HEX } from '../../shared/lib/colors.ts';

export function DashboardScreen() {
  const { t, locale } = useI18n();
  const scenario = useAppStore(selectActiveScenario);
  const settings = useAppStore(s => s.data.settings);
  const scenarioCount = useAppStore(s => s.data.scenarios.length);
  const { subjectResults, general } = useScenarioResults(scenario, settings);

  if (scenario.subjects.length === 0) {
    return (
      <RiveEmptyState
        icon={<Sparkles size={64} className="text-primary" />}
        title={t('dashboard.emptyTitle')}
        description={t('dashboard.emptyDescription')}
        action={
          <Link to="/subjects">
            <Button block>
              <Sparkles size={18} aria-hidden="true" />{' '}
              {t('dashboard.chooseSubjects')}
            </Button>
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

  const HeroIcon =
    general === null
      ? BarChart3
      : general >= 14
        ? Star
        : general >= 10
          ? Smile
          : Dumbbell;

  const activePeriod = scenario.periods.find(
    p => p.id === scenario.activePeriodId
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <PeriodBar />

      <Card className="flex items-center gap-4 bg-gradient-to-br from-primary to-[color:var(--color-accent)] text-white border-0">
        <RiveBadge
          fallback={<HeroIcon size={48} className="text-white" />}
          label={t('dashboard.heroBadgeLabel')}
          size={92}
        />
        <div className="min-w-0">
          <p className="text-sm/5 font-medium opacity-90">
            {t('dashboard.overallAverage')}
            {activePeriod ? ` · ${activePeriod.name}` : ''}
          </p>
          <p className="font-display text-4xl font-bold tabular-nums">
            {formatAverage(general, settings.rounding, settings.referenceBase)}
          </p>
          <p className="truncate text-sm opacity-90">
            {t('dashboard.scenarioName', { name: scenario.name })}
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
            <span className="font-semibold">{t('nav.scenarios')}</span>
            <span className="text-sm text-[var(--mg-text-soft)]">
              {t(`dashboard.scenariosSaved.${plural(locale, scenarioCount)}`, {
                count: scenarioCount,
              })}
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
            <span className="font-semibold">{t('nav.goal')}</span>
            <span className="text-sm text-[var(--mg-text-soft)]">
              {scenario.goal
                ? t('dashboard.goalDefined')
                : t('dashboard.goalToDefine')}
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
                {t('dashboard.strengths')}
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
                {t('dashboard.toImprove')}
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
          {t('dashboard.bySubject')}
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
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                  style={{ background: `${SUBJECT_HEX[r.subject.color]}1a` }}
                >
                  <SubjectIcon
                    icon={r.subject.icon}
                    size={20}
                    className="text-[var(--mg-text)]"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.subject.name}</p>
                  <p className="text-sm text-[var(--mg-text-soft)]">
                    {t(`common.gradeCount.${plural(locale, r.gradeCount)}`, {
                      count: r.gradeCount,
                    })}{' '}
                    · {t('common.weightShort', { weight: r.subject.weight })}
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
                  <Tag tone={appr.tone}>
                    {t(`dashboard.appreciation.${appr.tone}`)}
                  </Tag>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
