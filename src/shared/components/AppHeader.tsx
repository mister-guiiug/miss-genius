import { Brain, Moon, Sun } from 'lucide-react';
import { AppHeader as SocleHeader } from '@mister-guiiug/dev-pwa-config/react/app-header';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useAppStore } from '../../store/useAppStore.ts';
import { useI18n } from '../../i18n';

/**
 * En-tête : titre de page + bascule de thème.
 *
 * LA MISE EN PAGE VIENT DU SOCLE (`react/app-header`) : `<header>` collant,
 * zone sûre iOS, fond translucide, filet, et le titre rendu dans un vrai `h1`.
 * Ce qui reste ici est ce que le socle ne peut pas savoir — l'icône de l'app
 * et sa bascule de thème, passées en `leading` et en `actions`.
 */
export function AppHeader({ title }: { title: string }) {
  const { t } = useI18n();
  const theme = useAppStore(s => s.data.settings.theme);
  const setTheme = useAppStore(s => s.setTheme);
  const isDark = theme === 'dark';

  return (
    <SocleHeader
      title={title}
      leading={<Brain size={22} className="text-primary" aria-hidden="true" />}
      actions={
        <Button
          variant="ghost"
          aria-label={
            isDark ? t('header.switchToLight') : t('header.switchToDark')
          }
          aria-pressed={isDark}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? (
            <Sun size={20} aria-hidden="true" />
          ) : (
            <Moon size={20} aria-hidden="true" />
          )}
        </Button>
      }
    />
  );
}
