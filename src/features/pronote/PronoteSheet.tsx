import { useState, type FormEvent } from 'react';
import { CircleCheck, DownloadCloud, TriangleAlert } from 'lucide-react';
import { useAppStore, selectActiveScenario } from '../../store/useAppStore.ts';
import type { ImportPlan } from '../../shared/types/import.ts';
import { Sheet } from '../../shared/components/Sheet.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { TextField } from '../../shared/components/Field.tsx';
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Échec de la récupération.'
      );
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
    <Sheet open={open} title="Connecter Pronote" onClose={close}>
      {phase === 'done' && result ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CircleCheck
            size={48}
            className="text-[var(--mg-good)]"
            aria-hidden="true"
          />
          <p className="font-semibold">Import terminé</p>
          <p className="text-sm text-[var(--mg-text-soft)]">
            {result.gradesAdded} note{result.gradesAdded > 1 ? 's' : ''} ajoutée
            {result.gradesAdded > 1 ? 's' : ''} dans «&nbsp;
            {activePeriod?.name}&nbsp;» ({result.subjectsCreated} matière
            {result.subjectsCreated > 1 ? 's' : ''} créée
            {result.subjectsCreated > 1 ? 's' : ''}).
          </p>
          <Button block onClick={close}>
            Terminer
          </Button>
        </div>
      ) : phase === 'preview' && plan ? (
        <div className="flex flex-col gap-4">
          <p className="text-[15px]">
            <strong>{plan.grades.length}</strong> note
            {plan.grades.length > 1 ? 's' : ''} sur{' '}
            <strong>{plan.subjects.length}</strong> matière
            {plan.subjects.length > 1 ? 's' : ''} prêtes à importer dans «&nbsp;
            {activePeriod?.name}&nbsp;».
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
            Les matières déjà présentes ne sont pas dupliquées ; les notes
            s'ajoutent à la période active.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={reset}>
              Retour
            </Button>
            <Button block onClick={applyImport}>
              <DownloadCloud size={18} aria-hidden="true" /> Importer
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
              <p>
                Le connecteur Pronote n'est pas configuré sur ce déploiement
                (variable <code>VITE_PRONOTE_PROXY_URL</code> + Worker à
                déployer). Tu peux essayer l'import avec des données de
                démonstration.
              </p>
            </div>
          )}

          {configured && (
            <form
              onSubmit={handleFetch}
              className="flex flex-col gap-3"
              noValidate
            >
              <TextField
                label="Adresse Pronote"
                type="url"
                inputMode="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://xxxxxxx.index-education.net/pronote/eleve.html"
                autoComplete="off"
              />
              <TextField
                label="Identifiant"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
              <TextField
                label="Mot de passe"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                hint="Transmis au connecteur uniquement le temps de la requête, jamais enregistré."
              />
              {error && (
                <p role="alert" className="text-sm text-[var(--mg-bad)]">
                  {error}
                </p>
              )}
              <Button type="submit" block disabled={phase === 'loading'}>
                {phase === 'loading' ? 'Connexion…' : 'Récupérer mes notes'}
              </Button>
            </form>
          )}

          {!configured && error && (
            <p role="alert" className="text-sm text-[var(--mg-bad)]">
              {error}
            </p>
          )}

          <Button variant="secondary" block onClick={loadDemo}>
            Essayer avec des données de démo
          </Button>
        </div>
      )}
    </Sheet>
  );
}
