import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, makeCompletion, type FakeApi } from '../../api/test-utils';
import { renderScreen } from '../log/screen-test-utils';
import { InsightsScreen } from './InsightsScreen';

const completions = [
  makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-09-21', doneBy: 'Yard worker' }),
  makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-09-28', doneBy: 'Yard worker' }),
  makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-10-06', doneBy: 'Yard worker' }),
  makeCompletion({ taskId: 'trash-out', doneOn: '2026-10-06', doneBy: 'JT' }),
];

function routes(api: FakeApi) {
  api.on('GET /api/completions', () => jsonResponse({ completions }));
  api.on('GET /api/completions/latest', () => jsonResponse({ completions }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T18:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('InsightsScreen', () => {
  it('renders the stats, heatmap, on-time rates and by-person chart from a year of sign-offs', async () => {
    const { api } = renderScreen(<InsightsScreen />, { path: '/insights', routes });
    expect(screen.getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument();

    const heatmap = await screen.findByRole('grid', { name: 'Activity' });
    expect(within(heatmap).getAllByRole('gridcell').length).toBeGreaterThan(300);

    // Mowing: 7-day rainy cadence + 20% grace → 7 days and 8 days are both on time.
    const onTime = screen.getByRole('figure', { name: 'On-time rate by category' });
    expect(within(onTime).getByText('2 of 2 on time')).toBeInTheDocument();

    const byPerson = screen.getByRole('figure', { name: 'Who’s doing the work' });
    // Legend: alphabetical, so colour follows the person.
    expect(
      within(byPerson)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['JT', 'Yard worker']);

    expect(screen.getByText('Sign-offs, 30 days')).toBeInTheDocument();
    const call = api.callsTo('GET /api/completions')[0]!;
    expect(call.search.get('from')).toBe('2025-10-08');
    expect(call.search.get('to')).toBe('2026-10-07');
  });

  it('explains an empty week chart', async () => {
    renderScreen(<InsightsScreen />, {
      path: '/insights',
      lang: 'es',
      routes: (api) => {
        api.on('GET /api/completions', () => jsonResponse({ completions: [] }));
        api.on('GET /api/completions/latest', () => jsonResponse({ completions: [] }));
      },
    });
    expect(await screen.findByText('No hay firmas en las últimas 12 semanas')).toBeInTheDocument();
    expect(screen.getAllByText('Sin repeticiones aún').length).toBeGreaterThan(0);
  });
});
