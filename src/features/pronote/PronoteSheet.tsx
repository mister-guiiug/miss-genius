import { useState, type FormEvent } from 'react';
import { CircleCheck, DownloadCloud, TriangleAlert } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import { useI18n, plural } from '../../i18n';
import type { ImportPlan } from '../../shared/types/import.ts';
import { Sheet } from '@mister-guiiug/dev-wpa-config/react/sheet';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { TextField } from '@mister-guiiug/dev-wpa-config/react/field';
import { fetchPronoteGrades, isPronoteConfigured } from './pronoteClient.ts';
import { planFromPronote } from './pronoteMapping.ts';
import { MOCK_PRONOTE_RESPONSE } from './mockPronote.ts';

interface PronoteSheetProps {
  open: boolean;
  onClose: () => void;
}

type Phase = 'form' | 'loading' | 'preview' | 'done';

/** Connexion / import Pronote. Importe les notes dans la période active. */
export function PronoteSheet({ open, onClose }: PronoteSheetProps) {
  const { t, locale } = useI18n();
  const scenario = useAppStore(selectActiveScenario);
  const importSubjectsAndGrades = useAppStore(s => s.importSubjectsAndGrades);
  const configured = isPronoteConfigured();
  const activePeriod = scenario.periods.find(
    p => p.id === scenario.activePeriodId
  );

  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string>();
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [result, setResult] = useState<{
    subjectsCreated: number;
    gradesAdded: number;
  } | null>(null);

  function reset() {
    setPhase('form');
    setError(undefined);
    setPlan(null);
    setResult(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFetch(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPhase('loading');
    try {
      const resp = await fetchPronoteGrades({ url, username, password });
      setPlan(planFromPronote(resp));
      setPhase('preview');
    } catch {
      setError(t('pronote.errorFetch'));
      setPhase('form');
    }
  }

  function loadDemo() {
    setError(undefined);
    setPlan(planFromPronote(MOCK_PRONOTE_RESPONSE));
    setPhase('preview');
  }

  function applyImport() {
    if (!plan) return;
    const res = importSubjectsAndGrades(plan, scenario.activePeriodId);
    setResult(res);
    setPhase('done');
  }

  return (
    <Sheet open={open} title={t('pronote.title')} onClose={close}>
      {phase === 'done' && result ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CircleCheck
            size={48}
            className="text-[var(--mg-good)]"
            aria-hidden="true"
          />
          <p className="font-semibold">{t('pronote.doneTitle')}</p>
          <p className="text-sm text-[var(--mg-text-soft)]">
            {t(`pronote.done.grades.${plural(locale, result.gradesAdded)}`, {
              count: result.gradesAdded,
              period: activePeriod?.name ?? '',
            })}{' '}
            {t(
              `pronote.done.subjects.${plural(locale, result.subjectsCreated)}`,
              { count: result.subjectsCreated }
            )}
          </p>
          <Button block onClick={close}>
            {t('common.finish')}
          </Button>
        </div>
      ) : phase === 'preview' && plan ? (
        <div className="flex flex-col gap-4">
          <p className="text-[15px]">
            {t(`pronote.preview.grades.${plural(locale, plan.grades.length)}`, {
              count: plan.grades.length,
              period: activePeriod?.name ?? '',
            })}{' '}
            {t(
              `pronote.preview.subjects.${plural(locale, plan.subjects.length)}`,
              { count: plan.subjects.length }
            )}
          </p>
          <ul className="flex flex-wrap gap-2">
            {plan.subjects.map(s => (
              <li
                key={s.name}
                className="rounded-full bg-[var(--mg-surface-2)] px-3 py-1 text-xs font-semibold"
              >
                {s.name}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--mg-text-soft)]">
            {t('pronote.previewNote')}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={reset}>
              {t('common.back')}
            </Button>
            <Button block onClick={applyImport}>
              <DownloadCloud size={18} aria-hidden="true" />{' '}
              {t('pronote.import')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!configured && (
            <div className="flex gap-2 rounded-2xl bg-[var(--mg-amber)]/10 p-3 text-sm">
              <TriangleAlert
                size={18}
                className="mt-0.5 shrink-0 text-[var(--color-amber)]"
                aria-hidden="true"
              />
              <p>{t('pronote.notConfigured')}</p>
            </div>
          )}

          {configured && (
            <form
              onSubmit={handleFetch}
              className="flex flex-col gap-3"
              noValidate
            >
              <TextField
                label={t('pronote.urlLabel')}
                type="url"
                inputMode="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://xxxxxxx.index-education.net/pronote/eleve.html"
                autoComplete="off"
              />
              <TextField
                label={t('pronote.usernameLabel')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
              <TextField
                label={t('pronote.passwordLabel')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                hint={t('pronote.passwordHint')}
              />
              {error && (
                <p role="alert" className="text-sm text-[var(--mg-bad)]">
                  {error}
                </p>
              )}
              <Button type="submit" block disabled={phase === 'loading'}>
                {phase === 'loading'
                  ? t('pronote.connecting')
                  : t('pronote.fetch')}
              </Button>
            </form>
          )}

          {!configured && error && (
            <p role="alert" className="text-sm text-[var(--mg-bad)]">
              {error}
            </p>
          )}

          <Button variant="secondary" block onClick={loadDemo}>
            {t('pronote.tryDemo')}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
