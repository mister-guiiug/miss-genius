import { useRef, useState } from 'react';
import { Download, GraduationCap, RefreshCw, Upload } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { useI18n } from '../../i18n';
import type { GradeSort, RoundingMode } from '../../shared/types/domain.ts';
import { exportData, importData } from '../../shared/lib/storage.ts';
import { applyUpdate } from '@mister-guiiug/dev-wpa-config/sw-update';
import { dateSlug, downloadText } from '@mister-guiiug/dev-wpa-config/download';
import { cn } from '../../shared/lib/cn.ts';
import { Card } from '@mister-guiiug/dev-wpa-config/react/card';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { SelectField } from '@mister-guiiug/dev-wpa-config/react/field';
import { ConfirmDialog } from '@mister-guiiug/dev-wpa-config/react/confirm-dialog';
import { AppFooter } from '@mister-guiiug/dev-wpa-config/react/app-footer';
import { repoUrl } from '@mister-guiiug/dev-wpa-config/apps-catalog';
import { FamilyApps } from '@mister-guiiug/dev-wpa-config/react';
import { PronoteSheet } from '../pronote/PronoteSheet.tsx';

declare const __APP_VERSION__: string;

export function SettingsScreen() {
  const { t, locale, setLocale, locales } = useI18n();
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
    // La forme des données reste définie par `exportData` (storage.ts) : le
    // socle ne fournit que la mécanique de téléchargement.
    downloadText(
      exportData(data),
      `miss-genius-${dateSlug()}.json`,
      'application/json'
    );
    setFeedback(t('settings.exportDone'));
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      replaceData(importData(text));
      setFeedback(t('settings.importDone'));
    } catch {
      setFeedback(t('settings.importError'));
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">{t('settings.language')}</h2>
        <div
          role="group"
          aria-label={t('settings.languageAria')}
          className="flex gap-2"
        >
          {locales.map(loc => {
            const active = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                aria-pressed={active}
                onClick={() => setLocale(loc)}
                className={cn(
                  'min-h-11 flex-1 rounded-2xl px-4 text-sm font-semibold',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-[var(--mg-surface-2)] text-[var(--mg-text-soft)] border border-[var(--mg-border)]'
                )}
              >
                {t(`language.${loc}`)}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-bold">{t('settings.averagesTitle')}</h2>
        <SelectField
          label={t('settings.roundingLabel')}
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
          <option value="nearest">{t('settings.roundingNearest')}</option>
          <option value="floor">{t('settings.roundingFloor')}</option>
          <option value="ceil">{t('settings.roundingCeil')}</option>
          <option value="none">{t('settings.roundingNone')}</option>
        </SelectField>
        <SelectField
          label={t('settings.decimalsLabel')}
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
            {t('settings.normalizeLabel')}
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
        <h2 className="font-bold">{t('settings.displayTitle')}</h2>
        <SelectField
          label={t('settings.gradeSortLabel')}
          value={settings.gradeSort}
          onChange={e =>
            updateSettings({ gradeSort: e.target.value as GradeSort })
          }
        >
          <option value="date-desc">{t('settings.sortDateDesc')}</option>
          <option value="date-asc">{t('settings.sortDateAsc')}</option>
          <option value="value-desc">{t('settings.sortValueDesc')}</option>
          <option value="added">{t('settings.sortAdded')}</option>
        </SelectField>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">{t('settings.sourcesTitle')}</h2>
        <p className="text-sm text-[var(--mg-text-soft)]">
          {t('settings.sourcesText')}
        </p>
        <Button variant="secondary" onClick={() => setPronote(true)}>
          <GraduationCap size={16} aria-hidden="true" /> {t('pronote.title')}
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">{t('settings.backupTitle')}</h2>
        <p className="text-sm text-[var(--mg-text-soft)]">
          {t('settings.backupText')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} aria-hidden="true" /> {t('settings.exportJson')}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> {t('settings.importJson')}
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
        <h2 className="font-bold text-[var(--mg-bad)]">
          {t('settings.dangerTitle')}
        </h2>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          {t('settings.resetAll')}
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">{t('settings.appTitle')}</h2>
        <p className="text-sm text-[var(--mg-text-soft)]">
          {t('settings.appText')}
        </p>
        <Button
          variant="secondary"
          disabled={updating}
          onClick={() => {
            setUpdating(true);
            // Même stratégie que l'ancien `forceUpdate` local (activation du
            // worker en attente, purge sinon), avec plafonds de temps en plus.
            void applyUpdate();
          }}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={updating ? 'animate-spin' : undefined}
          />
          {updating ? t('settings.updating') : t('settings.forceUpdate')}
        </Button>
      </Card>

      <Card className="mg-family">
        <FamilyApps
          currentAppId="miss-genius"
          showSource={false}
          showSponsor={false}
          labels={{ otherApps: t('settings.otherApps') }}
        />
      </Card>

      {/* La phrase d'accroche reste ici : le pied de page du socle ne porte
          que les deux liens de la règle famille (source, sponsor). */}
      <p className="text-center text-xs text-[var(--mg-text-soft)]">
        {t('footer.tagline')}
      </p>
      <AppFooter
        repoUrl={repoUrl('miss-genius')}
        sourceLabel={t('footer.sourceCode')}
        sponsorLabel={t('footer.buyCoffee')}
      />

      <p className="text-center text-xs text-[var(--mg-text-soft)]">
        {t('settings.version', { version: __APP_VERSION__ })}
      </p>

      <ConfirmDialog
        open={confirmReset}
        title={t('settings.resetConfirmTitle')}
        message={t('settings.resetConfirmMessage')}
        confirmLabel={t('settings.resetConfirmButton')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          setConfirmReset(false);
          setFeedback(t('settings.resetDone'));
        }}
      />

      <PronoteSheet open={pronote} onClose={() => setPronote(false)} />
    </div>
  );
}
