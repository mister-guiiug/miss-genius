import { useAppStore } from '../../store/useAppStore.ts';
import { Button } from './Button.tsx';

/** En-tête : titre de page + bascule de thème. */
export function AppHeader({ title }: { title: string }) {
  const theme = useAppStore(s => s.data.settings.theme);
  const setTheme = useAppStore(s => s.setTheme);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--mg-border)] bg-[var(--mg-surface)]/95 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          🧠
        </span>
        <h1 className="font-display text-lg font-bold leading-none">{title}</h1>
      </div>
      <Button
        variant="ghost"
        aria-label={theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
      </Button>
    </header>
  );
}
