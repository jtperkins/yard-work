import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi, makeCompletion } from '../../api/test-utils';
import { renderScreen } from '../shared/test-utils';
import { TaskDetailScreen, TasksScreen } from './index';

function api() {
  const fake = createFakeApi();
  fake.on('GET /api/completions/latest', {
    completions: [makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-10-06', doneBy: 'Luis' })],
  });
  return fake;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('TasksScreen', () => {
  it('groups the catalog by category with status, cadence and draft badges', async () => {
    renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    expect(screen.getByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
    const lawn = screen.getByRole('list', { name: 'Lawn tasks' });
    const mow = within(lawn).getByRole('link', { name: /Mow the lawn/ });
    expect(mow).toHaveAttribute('href', '/tasks/mow-lawn');
    expect(mow).toHaveTextContent('Every 7 days in rainy season · every 14 days in dry season');
    await waitFor(() => expect(mow).toHaveTextContent('Last done yesterday by Luis'));
    expect(mow).toHaveTextContent('On track');
    expect(within(mow).getByText('Draft')).toBeInTheDocument();
  });

  it('filters by search text (either language, accents ignored) and category', async () => {
    const { user, location } = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'canoas');
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/tasks/clean-gutters', '/tasks/gutters-deep-clean']),
    );
    expect(hrefs).not.toContain('/tasks/mow-lawn');
    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: /^Cats/ }));
    expect(screen.queryByRole('list', { name: 'Lawn tasks' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Cats tasks' })).toBeInTheDocument();
    expect(location()).toBe('/tasks?cat=cats');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('list', { name: 'Lawn tasks' })).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    const { user } = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await user.type(screen.getByRole('searchbox'), 'helicopter');
    expect(screen.getByText('No tasks match')).toBeInTheDocument();
  });
});

describe('TaskDetailScreen', () => {
  function renderDetail(id: string, me: string | null = 'JT') {
    const fake = api();
    fake.on('GET /api/completions', {
      completions: [
        makeCompletion({
          taskId: 'mow-lawn',
          doneOn: '2026-10-06',
          doneBy: 'Luis',
          loggedBy: 'JT',
          note: 'Front only',
        }),
        makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-09-29', doneBy: 'JT', loggedBy: 'JT' }),
      ],
    });
    return renderScreen(<TaskDetailScreen />, {
      api: fake,
      me,
      path: `/tasks/${id}`,
      route: '/tasks/:id',
    });
  }

  it('shows numbered steps, safety, supplies, facts, draft notice and history', async () => {
    const { api: fake } = renderDetail('mow-lawn');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Mow the lawn (chapia)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Draft — needs confirming')).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Steps' });
    expect(within(steps).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Safety first')).toBeInTheDocument();
    expect(
      screen.getByText('Every 7 days in rainy season · every 14 days in dry season'),
    ).toBeInTheDocument();

    const history = await screen.findByRole('list', { name: 'Sign-offs for this task' });
    expect(within(history).getAllByRole('listitem')).toHaveLength(2);
    expect(history).toHaveTextContent('Done by Luis · signed by JT');
    expect(history).toHaveTextContent('Front only');
    const call = fake.callsTo('GET /api/completions')[0]!;
    expect(call.search.get('task')).toBe('mow-lawn');
    expect(call.search.get('to')).toBe('2026-10-07');
    expect(await screen.findByRole('button', { name: 'Sign off' })).toBeInTheDocument();
  });

  it('offers sign-in instead of sign-off when signed out', async () => {
    renderDetail('mow-lawn', null);
    expect(await screen.findByRole('link', { name: 'Sign in to sign off' })).toHaveAttribute(
      'href',
      '/login?next=%2Ftasks%2Fmow-lawn',
    );
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
  });

  it('opens the sign-off sheet for the task', async () => {
    const { user } = renderDetail('mow-lawn');
    await user.click(await screen.findByRole('button', { name: 'Sign off' }));
    expect(await screen.findByRole('dialog', { name: 'Sign off work' })).toHaveTextContent(
      'Mow the lawn (chapia)',
    );
  });

  it('handles unknown task ids', () => {
    renderDetail('nope');
    expect(screen.getByRole('heading', { level: 1, name: 'Task not found' })).toBeInTheDocument();
  });
});
