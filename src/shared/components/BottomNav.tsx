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

interface Tab {
  to: string;
  label: string;
  Icon: LucideIcon;
  end: boolean;
}

const tabs: Tab[] = [
  { to: '/', label: 'Accueil', Icon: House, end: true },
  { to: '/subjects', label: 'Matières', Icon: BookOpen, end: false },
  { to: '/scenarios', label: 'Scénarios', Icon: SlidersHorizontal, end: false },
  { to: '/goal', label: 'Objectif', Icon: Target, end: false },
  { to: '/settings', label: 'Réglages', Icon: Settings, end: false },
];

/** Navigation principale mobile : bottom nav, zones tactiles ≥ 44px. */
export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky bottom-0 z-30 border-t border-[var(--mg-border)] bg-[var(--mg-surface)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ to, label, Icon, end }) => (
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
                  <span>{label}</span>
                  {isActive && <span className="sr-only">(page active)</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
