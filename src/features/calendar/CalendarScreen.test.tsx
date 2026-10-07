import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, makeCompletion, makePlanItem, type FakeApi } from '../../api/test-utils';
import { getCatalog } from '../../domain/catalog';
import { renderScreen } from '../log/screen-test-utils';
import { CalendarScreen } from './CalendarScreen';

const mow = getCatalog().taskById.get('mow-lawn')!;

function routes(api: FakeApi) {
  const done = makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-10-05', doneBy: 'Yard worker' });
  api.on('GET /api/completions', () => jsonResponse({ completions: [done] }));
  api.on('GET /api/completions/latest', () => jsonResponse({ completions: [done] }));
  api.on('GET /api/plan', (call) =>
    jsonResponse({
      items:
        call.search.get('week') === '2026-10-05'
          ? [makePlanItem({ weekStart: '2026-10-05', taskId: 'trash-out', assignee: 'JT' })]
          : [],
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T18:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const render = (path = '/calendar') =>
  renderScreen(<CalendarScreen />, { path, route: '/calendar/:ym?', user: null, routes });

describe('CalendarScreen', () => {
  it('shows the month with sign-offs, yard-day plans and projected due dates in day labels', async () => {
    const { api } = render();
    expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'October 2026' })).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Monday, October 5, 1 signed off' }),
    ).toBeInTheDocument();
    // Thursday is yard day: the planned item sits there.
    expect(
      screen.getByRole('button', { name: /^Thursday, October 8, 1 planned/ }),
    ).toBeInTheDocument();
    // Mowing every 7 days in the rainy season → next due Oct 12.
    expect(
      screen.getByRole('button', { name: /^Monday, October 12, .*1 coming due/ }),
    ).toBeInTheDocument();
    // Six week plans requested for the grid.
    expect(api.callsTo('GET /api/plan')).toHaveLength(6);
  });

  it('selects today by default and lists a tapped day', async () => {
    render();
    const panel = await screen.findByRole('region', { name: /Wednesday, October 7/ });
    expect(
      await within(panel).findByRole('heading', { name: /Planned this week/ }),
    ).toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole('button', { name: /^Monday, October 12, .*coming due/ }),
    );
    const next = screen.getByRole('region', { name: /Monday, October 12/ });
    expect(within(next).getByRole('heading', { name: /Coming due/ })).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: mow.name.en })).toBeInTheDocument();
  });

  it('filters by category', async () => {
    render();
    await screen.findByRole('button', { name: 'Monday, October 5, 1 signed off' });
    await userEvent.click(screen.getByRole('button', { name: /^Cats/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Monday, October 5' })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(
      screen.getByRole('button', { name: 'Monday, October 5, 1 signed off' }),
    ).toBeInTheDocument();
  });

  it('steps between months', async () => {
    render('/calendar/2026-10');
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { level: 2, name: 'November 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('heading', { level: 2, name: 'October 2026' })).toBeInTheDocument();
  });
});
