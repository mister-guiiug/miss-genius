import { useRef, useState } from 'react';
import { Download, GraduationCap, RefreshCw, Upload } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import type { GradeSort, RoundingMode } from '../../shared/types/domain.ts';
import { exportData, importData } from '../../shared/lib/storage.ts';
import { forceUpdate } from '../../pwa/forceUpdate.ts';
import { Card } from '../../shared/components/Card.tsx';
import { Button } from '../../shared/components/Button.tsx';
import { SelectField } from '../../shared/components/Field.tsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.tsx';
import { AppFooter } from '../../shared/components/AppFooter.tsx';
import { PronoteSheet } from '../pronote/PronoteSheet.tsx';

declare const __APP_VERSION__: string;

export function SettingsScreen() {
  const data = useAppStore(s => s.data);
  const settings = data.settings;
  const updateSettings = useAppStore(s => s.updateSettings);
  const replaceData = useAppStore(s => s.replaceData);
  const resetAll = useAppStore(s => s.resetAll);

  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [pronote, setPronote] = useState(false);
  const [feedback, setFeedback] = useState<string>();

  function handleExport() {
    const blob = new Blob([exportData(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miss-genius-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Sauvegarde exportée.');
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      replaceData(importData(text));
      setFeedback('Données importées avec succès.');
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : 'Import impossible : fichier invalide.'
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex flex-col gap-4">
        <h2 className="font-bold">Calcul des moyennes</h2>
        <SelectField
          label="Arrondi affiché"
          value={settings.rounding.mode}
          onChange={e =>
            updateSettings({
              rounding: {
                ...settings.rounding,
                mode: e.target.value as RoundingMode,
              },
            })
          }
        >
          <option value="nearest">Au plus proche</option>
          <option value="floor">Au plancher (inférieur)</option>
          <option value="ceil">Au plafond (supérieur)</option>
          <option value="none">Exact (aucun)</option>
        </SelectField>
        <SelectField
          label="Décimales"
          value={String(settings.rounding.decimals)}
          onChange={e =>
            updateSettings({
              rounding: {
                ...settings.rounding,
                decimals: Number(e.target.value),
              },
            })
          }
        >
          {[0, 1, 2, 3].map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </SelectField>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            Normaliser les notes sur d'autres bases
          </span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-[var(--color-primary)]"
            checked={settings.normalizeBases}
            onChange={e => updateSettings({ normalizeBases: e.target.checked })}
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Affichage</h2>
        <SelectField
          label="Ordre des notes (par matière)"
          value={settings.gradeSort}
          onChange={e =>
            updateSettings({ gradeSort: e.target.value as GradeSort })
          }
        >
          <option value="date-desc">Date — plus récente d'abord</option>
          <option value="date-asc">Date — plus ancienne d'abord</option>
          <option value="value-desc">Note — meilleure d'abord</option>
          <option value="added">Ordre d'ajout</option>
        </SelectField>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Sources de notes</h2>
        <p className="text-sm text-[var(--mg-text-soft)]">
          Importe automatiquement tes notes depuis Pronote dans la période
          active.
        </p>
        <Button variant="secondary" onClick={() => setPronote(true)}>
          <GraduationCap size={16} aria-hidden="true" /> Connecter Pronote
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Sauvegarde locale</h2>
        <p className="text-sm text-[var(--mg-text-soft)]">
          Tes données restent sur cet appareil. Exporte-les pour les conserver
          ou les transférer.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} aria-hidden="true" /> Exporter (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Importer (JSON)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = '';
            }}
          />
        </div>
        {feedback && (
          <p
            role="status"
            className="text-sm font-medium text-[var(--mg-good)]"
          >
            {feedback}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold text-[var(--mg-bad)]">Zone sensible</h2>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Réinitialiser toutes les données
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Application</h2>
        <p className="text-sm text-[var(--mg-text-soft)]">
          Récupère la dernière version (recharge l'app sans toucher à tes
          données).
        </p>
        <Button
          variant="secondary"
          disabled={updating}
          onClick={() => {
            setUpdating(true);
            void forceUpdate();
          }}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={updating ? 'animate-spin' : undefined}
          />
          {updating ? 'Mise à jour…' : 'Forcer la mise à jour'}
        </Button>
      </Card>

      <AppFooter />

      <p className="text-center text-xs text-[var(--mg-text-soft)]">
        Miss Genius v{__APP_VERSION__}
      </p>

      <ConfirmDialog
        open={confirmReset}
        title="Tout réinitialiser ?"
        message="Tous les scénarios, matières et notes seront effacés. Cette action est irréversible."
        confirmLabel="Tout effacer"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          setConfirmReset(false);
          setFeedback('Données réinitialisées.');
        }}
      />

      <PronoteSheet open={pronote} onClose={() => setPronote(false)} />
    </div>
  );
}
