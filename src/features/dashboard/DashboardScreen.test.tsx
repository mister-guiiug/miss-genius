import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardScreen } from './DashboardScreen.tsx';
import { useAppStore } from '../../store/useAppStore.ts';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardScreen />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  act(() => useAppStore.getState().resetAll());
});

afterEach(cleanup);

describe('DashboardScreen', () => {
  it('affiche l’état vide quand il n’y a aucune matière', () => {
    renderDashboard();
    expect(
      screen.getByRole('heading', { name: /Bienvenue dans Miss Genius/i })
    ).toBeInTheDocument();
  });

  it('affiche la moyenne générale pondérée une fois des notes saisies', () => {
    act(() => {
      const store = useAppStore.getState();
      store.addSubject({ name: 'Maths', weight: 4, color: 'violet' });
      store.addSubject({ name: 'Histoire', weight: 2, color: 'amber' });
    });
    act(() => {
      const { data, addGrade } = useAppStore.getState();
      const [maths, hist] = data.scenarios[0]!.subjects;
      addGrade({ subjectId: maths!.id, value: 15, max: 20, weight: 1 });
      addGrade({ subjectId: hist!.id, value: 12, max: 20, weight: 1 });
    });

    renderDashboard();
    // (15*4 + 12*2) / 6 = 14
    expect(screen.getByText('14/20')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Par matière/i })
    ).toBeInTheDocument();
  });
});
