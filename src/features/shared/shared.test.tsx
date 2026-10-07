import { renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createFakeApi, createTestQueryClient } from '../../api/test-utils';
import { getCatalog } from '../../domain/catalog';
import type { TaskStatus } from '../../domain/schedule';
import type { Lang } from '../../i18n';
import { RequireAuth } from './RequireAuth';
import { SignInCta } from './SignInCta';
import { formatMonthRanges, useTaskText } from './taskText';
import { renderScreen, TestProviders } from './test-utils';

describe('SignInCta', () => {
  it('links to /login with the current location as `next`', () => {
    renderScreen(<SignInCta />, { path: '/week/2026-10-05?x=1' });
    expect(screen.getByRole('link', { name: 'Sign in to sign off' })).toHaveAttribute(
      'href',
      '/login?next=%2Fweek%2F2026-10-05%3Fx%3D1',
    );
  });

  it('accepts a label and explicit return path', () => {
    renderScreen(<SignInCta label="Sign in to plan" returnTo="/week" />);
    expect(screen.getByRole('link', { name: 'Sign in to plan' })).toHaveAttribute(
      'href',
      '/login?next=%2Fweek',
    );
  });
});

describe('RequireAuth', () => {
  it('renders children when signed in', async () => {
    renderScreen(<RequireAuth>secret notes</RequireAuth>, { me: 'JT' });
    expect(await screen.findByText('secret notes')).toBeInTheDocument();
  });

  it('shows a sign-in prompt (not the children) when signed out', async () => {
    renderScreen(<RequireAuth>secret notes</RequireAuth>, { path: '/handoff' });
    expect(
      await screen.findByRole('heading', { name: 'Sign in to see this page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fhandoff',
    );
    expect(screen.queryByText('secret notes')).not.toBeInTheDocument();
  });

  it('uses a custom fallback when given', async () => {
    renderScreen(<RequireAuth fallback={<p>nope</p>}>secret</RequireAuth>);
    expect(await screen.findByText('nope')).toBeInTheDocument();
  });

  it('shows a loading state while the session is unknown', () => {
    renderScreen(<RequireAuth>secret</RequireAuth>);
    expect(screen.getByLabelText('Loading…')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('formatMonthRanges', () => {
  it('compresses runs, including across the new year', () => {
    expect(formatMonthRanges([12, 1, 2, 3, 4], 'en')).toBe('Dec–Apr');
    expect(formatMonthRanges([3, 4], 'en')).toBe('Mar–Apr');
    expect(formatMonthRanges([1, 3, 4, 6], 'en')).toBe('Jan, Mar–Apr, Jun');
    expect(formatMonthRanges([12, 1, 2, 3, 4], 'es')).toMatch(/^dic–abr$/);
    expect(formatMonthRanges([], 'en')).toBe('');
    expect(formatMonthRanges([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'en')).toBe('');
  });
});

describe('useTaskText', () => {
  function hook(lang: Lang = 'en') {
    const api = createFakeApi();
    const qc = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TestProviders api={api} qc={qc} lang={lang}>
        {children}
      </TestProviders>
    );
    return renderHook(() => useTaskText(), { wrapper }).result.current;
  }
  const base: TaskStatus = { taskId: 'x', state: 'ok', frequencyDays: 7 };
  const today = '2026-10-07';

  it('describes due dates', () => {
    const text = hook();
    expect(text.dueText({ ...base, state: 'overdue', daysUntilDue: -3 }, today)).toBe(
      '3 days overdue',
    );
    expect(text.dueText({ ...base, state: 'due-soon', daysUntilDue: 0 }, today)).toBe('Due today');
    expect(text.dueText({ ...base, state: 'due-soon', daysUntilDue: 1 }, today)).toBe(
      'Due tomorrow',
    );
    expect(text.dueText({ ...base, daysUntilDue: 5 }, today)).toBe('Due in 5 days');
    expect(text.dueText({ ...base, daysUntilDue: 40, nextDue: '2026-11-16' }, today)).toBe(
      'Nov 16',
    );
    expect(text.dueText({ ...base, state: 'never' }, today)).toBe('Never done — due now');
    expect(text.dueText({ ...base, state: 'dormant', nextDue: '2026-12-01' }, today)).toBe(
      'Out of season until Dec 1',
    );
  });

  it('describes cadence, season and last done', () => {
    const text = hook();
    const { taskById } = getCatalog();
    expect(text.frequencyText(taskById.get('rust-inspection')!)).toBe('Every 30 days');
    expect(text.frequencyText(taskById.get('daily-cat-care')!)).toBe('Every day');
    expect(text.activeText(taskById.get('repaint-metal')!)).toBe('Active Dec–Apr');
    expect(text.activeText(taskById.get('rust-inspection')!)).toBe('');
    expect(text.lastDoneText({ ...base, lastDone: '2026-10-04', lastDoneBy: 'Luis' }, today)).toBe(
      'Last done 3 days ago by Luis',
    );
    expect(text.lastDoneText(base, today)).toBe('Never done');
    expect(text.categoryColor('lawn')).toBe('cat-lawn');
  });

  it('speaks Spanish', () => {
    const text = hook('es');
    expect(text.dueText({ ...base, state: 'overdue', daysUntilDue: -1 }, today)).toBe(
      '1 día de atraso',
    );
    expect(text.lastDoneText({ ...base, lastDone: today }, today)).toBe('Última vez hoy');
    expect(text.categoryLabel('lawn')).toBe('Zacate');
  });
});
