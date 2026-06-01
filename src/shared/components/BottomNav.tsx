import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn.ts';

const tabs = [
  { to: '/', label: 'Accueil', icon: '🏠', end: true },
  { to: '/subjects', label: 'Matières', icon: '📚', end: false },
  { to: '/scenarios', label: 'Scénarios', icon: '🎛️', end: false },
  { to: '/goal', label: 'Objectif', icon: '🎯', end: false },
  { to: '/settings', label: 'Réglages', icon: '⚙️', end: false },
];

/** Navigation principale mobile : bottom nav, zones tactiles ≥ 44px. */
export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky bottom-0 z-30 border-t border-[var(--mg-border)] bg-[var(--mg-surface)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(tab => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                  isActive ? 'text-primary' : 'text-[var(--mg-text-soft)]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden="true" className="text-xl leading-none">
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
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
