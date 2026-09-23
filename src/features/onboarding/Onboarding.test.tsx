import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding } from './Onboarding.tsx';
import { I18nProvider } from '../../i18n';
import { useAppStore } from '../../store/useAppStore.ts';

function renderOnboarding() {
  return render(
    <I18nProvider>
      <Onboarding />
    </I18nProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  // jsdom rapporte `en-US` : sans la locale forcée, l'écran s'ouvre en anglais.
  localStorage.setItem('genius_locale', 'fr');
  act(() => useAppStore.getState().resetAll());
});

afterEach(cleanup);

describe('Onboarding', () => {
  it('le premier écran dit ce que fait l’app, sans qu’on ait à avancer', () => {
    renderOnboarding();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const points = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(points.map(p => p.textContent)).toEqual([
      'Ta moyenne générale, calculée avec les coefficients',
      'Trimestres, semestres et scénarios « et si… »',
      'La note à viser pour atteindre ton objectif',
    ]);
    expect(screen.getByText(/Gratuit et sans compte/)).toBeInTheDocument();
  });

  it('les écrans suivants détaillent sans répéter le résumé', async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tes matières, tes notes' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    // La promesse, elle, reste sous chaque écran.
    expect(screen.getByText(/Gratuit et sans compte/)).toBeInTheDocument();
  });
});
