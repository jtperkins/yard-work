import { renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createFakeApi, createTestQueryClient } from '../../api/test-utils';
import { makeOneOff, makeTask } from '../../domain/test-fixtures';
import type { TaskStatus } from '../../domain/schedule';
import type { Lang } from '../../i18n';
import { RequireAuth } from './RequireAuth';
import { SignInCta } from './SignInCta';
import { useTaskText } from './taskText';
import { renderScreen, TestProviders } from './test-utils';

describe('SignInCta', () => {
  it('links to /login with the current location as `next`', () => {
    renderScreen(<SignInCta />, { path: '/tasks/chapia?x=1' });
    expect(screen.getByRole('link', { name: 'Sign in to sign off' })).toHaveAttribute(
      'href',
      '/login?next=%2Ftasks%2Fchapia%3Fx%3D1',
    );
  });

  it('accepts a label and explicit return path', () => {
    renderScreen(<SignInCta label="Sign in to plan" returnTo="/tasks" />);
    expect(screen.getByRole('link', { name: 'Sign in to plan' })).toHaveAttribute(
      'href',
      '/login?next=%2Ftasks',
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
    expect(text.dueText({ ...base, state: 'done', lastDone: '2026-10-05' }, today)).toBe(
      'Done 2 days ago',
    );
  });

  it('describes intervals, one-offs and last done', () => {
    const text = hook();
    const every = (count: number, unit: 'day' | 'week' | 'month') =>
      text.frequencyText(makeTask({ id: 'x', intervalCount: count, intervalUnit: unit }));
    expect(every(14, 'day')).toBe('Every 14 days');
    expect(every(1, 'day')).toBe('Every day');
    expect(every(2, 'week')).toBe('Every 2 weeks');
    expect(every(6, 'month')).toBe('Every 6 months');
    expect(text.frequencyText(makeOneOff('x'))).toBe('One-off');
    expect(text.frequencyText(makeOneOff('x', '2026-10-30'))).toBe('One-off · due Oct 30');
    expect(text.lastDoneText({ ...base, lastDone: '2026-10-04', lastDoneBy: 'Luis' }, today)).toBe(
      'Last done 3 days ago by Luis',
    );
    expect(text.lastDoneText(base, today)).toBe('Never done');
  });

  it('speaks Spanish', () => {
    const text = hook('es');
    expect(text.dueText({ ...base, state: 'overdue', daysUntilDue: -1 }, today)).toBe(
      '1 día de atraso',
    );
    expect(text.lastDoneText({ ...base, lastDone: today }, today)).toBe('Última vez hoy');
    expect(text.frequencyText(makeTask({ id: 'x', intervalCount: 2, intervalUnit: 'week' }))).toBe(
      'Cada 2 semanas',
    );
    expect(text.taskName(makeTask({ id: 'x', title: 'Mow', titleEs: 'Chapia' }))).toBe('Chapia');
    expect(text.taskName(makeTask({ id: 'x', title: 'Mow', titleEs: null }))).toBe('Mow');
  });
});
