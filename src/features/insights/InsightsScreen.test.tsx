import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, makeCompletion, type FakeApi } from '../../api/test-utils';
import { makeTask } from '../../domain/test-fixtures';
import { renderScreen } from '../log/screen-test-utils';
import { InsightsScreen } from './InsightsScreen';

const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];

function routesFor(completions: object[], taskList: object[] = tasks) {
  return (api: FakeApi) => {
    api.on('GET /api/completions', () => jsonResponse({ completions }));
    api.on('GET /api/completions/latest', () => jsonResponse({ completions }));
    api.on('GET /api/tasks', () => jsonResponse({ tasks: taskList }));
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T18:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('InsightsScreen', () => {
  it('renders three stat tiles, the heatmap and the by-person chart', async () => {
    const completions = [
      makeCompletion({ taskId: 'a', doneOn: '2026-09-21', doneBy: 'Yard worker' }),
      makeCompletion({ taskId: 'a', doneOn: '2026-10-06', doneBy: 'Yard worker' }),
      makeCompletion({ taskId: 'b', doneOn: '2026-10-06', doneBy: 'JT' }),
    ];
    const { api } = renderScreen(<InsightsScreen />, {
      path: '/insights',
      routes: routesFor(completions),
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument();

    const heatmap = await screen.findByRole('grid', { name: 'Activity' });
    expect(within(heatmap).getAllByRole('gridcell').length).toBeGreaterThan(300);

    const byPerson = screen.getByRole('figure', { name: 'Who’s doing the work' });
    expect(
      within(byPerson)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['JT', 'Yard worker']);

    expect(screen.getByText('Sign-offs, 30 days')).toBeInTheDocument();
    expect(screen.queryByText('Done on time')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('figure', { name: 'On-time rate by category' }),
    ).not.toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(
      within(summary).getAllByText(/^(Sign-offs, 30 days|Days with work done|Tasks on track)$/),
    ).toHaveLength(3);

    const call = api.callsTo('GET /api/completions')[0]!;
    expect(call.search.get('from')).toBe('2025-10-08');
    expect(call.search.get('to')).toBe('2026-10-07');
  });

  it('counts full sign-offs only and shows tasks on track from the task list', async () => {
    // `a` has a full sign-off today (ok), `b` only a partial one (still never done).
    const completions = [
      makeCompletion({ taskId: 'a', doneOn: '2026-10-07', doneBy: 'JT' }),
      makeCompletion({ taskId: 'b', doneOn: '2026-10-07', doneBy: 'JT', partial: true, note: 'x' }),
    ];
    renderScreen(<InsightsScreen />, { path: '/insights', routes: routesFor(completions) });

    const summary = await screen.findByRole('region', { name: 'Summary' });
    const tile = (label: string) => screen.getByText(label).parentElement!.parentElement!;
    await waitFor(() => expect(within(summary).getByText('50%')).toBeInTheDocument());
    expect(tile('Sign-offs, 30 days')).toHaveTextContent('Sign-offs, 30 days1');
    expect(tile('Tasks on track')).toHaveTextContent('Tasks on track50%');

    const heatmap = await screen.findByRole('grid', { name: 'Activity' });
    const today = within(heatmap).getByRole('gridcell', { name: /^1 sign-off on .*Oct 7, 2026$/ });
    expect(today).toBeInTheDocument();

    const byPerson = screen.getByRole('figure', { name: 'Who’s doing the work' });
    await userEvent.click(within(byPerson).getByRole('button', { name: 'Show table' }));
    const row = within(byPerson).getByRole('row', { name: /Week of Oct 5/ });
    const cells = within(row).getAllByRole('cell');
    expect(cells.at(-1)).toHaveTextContent('1');
  });

  it('shows the load error, never a percentage, when the task list fails', async () => {
    renderScreen(<InsightsScreen />, {
      path: '/insights',
      routes: (api) => {
        api.on('GET /api/completions', () => jsonResponse({ completions: [] }));
        api.on('GET /api/completions/latest', () => jsonResponse({ completions: [] }));
        api.on('GET /api/tasks', () => jsonResponse({ error: 'boom' }, 500));
      },
    });
    expect(await screen.findByText('Couldn’t load the insights.')).toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });

  it('explains an empty week chart', async () => {
    renderScreen(<InsightsScreen />, {
      path: '/insights',
      lang: 'es',
      routes: routesFor([], []),
    });
    expect(await screen.findByText('No hay firmas en las últimas 12 semanas')).toBeInTheDocument();
  });
});
