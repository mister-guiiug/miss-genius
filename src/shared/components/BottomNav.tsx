import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  House,
  SlidersHorizontal,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn.ts';
import { useI18n } from '../../i18n';

interface Tab {
  to: string;
  /** Clé de libellé sous `nav.*`. */
  key: 'home' | 'subjects' | 'scenarios' | 'goal' | 'settings';
  Icon: LucideIcon;
  end: boolean;
}

const tabs: Tab[] = [
  { to: '/', key: 'home', Icon: House, end: true },
  { to: '/subjects', key: 'subjects', Icon: BookOpen, end: false },
  { to: '/scenarios', key: 'scenarios', Icon: SlidersHorizontal, end: false },
  { to: '/goal', key: 'goal', Icon: Target, end: false },
  { to: '/settings', key: 'settings', Icon: Settings, end: false },
];

/** Navigation principale mobile : bottom nav, zones tactiles ≥ 44px. */
export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('nav.ariaLabel')}
      className="sticky bottom-0 z-30 border-t border-[var(--mg-border)] bg-[var(--mg-surface)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ to, key, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                  isActive ? 'text-primary' : 'text-[var(--mg-text-soft)]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 2}
                    aria-hidden="true"
                  />
                  <span>{t(`nav.${key}`)}</span>
                  {isActive && (
                    <span className="sr-only">{t('nav.currentPage')}</span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
