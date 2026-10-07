import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, makeCompletion } from '../../api/test-utils';
import { downloadTextFile } from './download';
import { LogScreen } from './LogScreen';
import { renderScreen } from './screen-test-utils';

vi.mock('./download', () => ({ downloadTextFile: vi.fn() }));

const rows = [
  makeCompletion({
    id: '00000000-0000-4000-8000-0000000000a1',
    taskId: 'mow-lawn',
    doneOn: '2026-10-06',
    doneBy: 'Yard worker',
    loggedBy: 'JT',
    note: 'Back slope, "careful" of the ditch',
    createdAt: '2026-10-06T20:00:00.000Z',
  }),
  makeCompletion({
    id: '00000000-0000-4000-8000-0000000000a2',
    taskId: 'daily-cat-care',
    doneOn: '2026-10-05',
    doneBy: 'JT',
    loggedBy: 'JT',
    note: null,
    createdAt: '2026-10-05T13:00:00.000Z',
  }),
];

function setup(user: string | null, path = '/log') {
  return renderScreen(<LogScreen />, {
    path,
    route: '/log',
    user,
    routes: (api) => {
      api.on('GET /api/completions', () => jsonResponse({ completions: rows }));
      api.on('DELETE /api/completions/00000000-0000-4000-8000-0000000000a2', () =>
        jsonResponse({ ok: true }),
      );
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T18:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.mocked(downloadTextFile).mockClear();
});

describe('LogScreen', () => {
  it('lists sign-offs read-only when signed out, asking the server for the last 90 days', async () => {
    const { api } = setup(null);
    expect(screen.getByRole('heading', { level: 1, name: 'Log' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Sign-offs' });
    expect(within(list).getByText(/Done by Yard worker · signed by JT/)).toBeInTheDocument();
    expect(within(list).getByText('Done and signed by JT')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete sign-off/ })).not.toBeInTheDocument();

    const call = api.callsTo('GET /api/completions')[0]!;
    expect(call.search.get('from')).toBe('2026-07-10');
    expect(call.search.get('to')).toBe('2026-10-07');
  });

  it('exports the filtered rows as escaped CSV', async () => {
    setup(null);
    await screen.findByRole('list', { name: 'Sign-offs' });
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0]!;
    expect(filename).toBe('yard-work-log-2026-10-07.csv');
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Date,Task,Category,Done by,Signed by,Note,Task ID,Logged at (UTC)');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"Back slope, ""careful"" of the ditch"');
    expect(lines[1]!.startsWith('2026-10-06,')).toBe(true);
  });

  it('filters by person and exports only what is shown', async () => {
    setup(null);
    await screen.findByRole('list', { name: 'Sign-offs' });
    await userEvent.selectOptions(screen.getByLabelText('Person'), 'JT');
    await waitFor(() => expect(screen.queryByText(/Done by Yard worker/)).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const csv = vi.mocked(downloadTextFile).mock.calls[0]![1];
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('daily-cat-care');
  });

  it('shows the filtered empty state and disables export when nothing matches', async () => {
    setup(null, '/log?category=safety');
    expect(await screen.findByText('Nothing matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('lets a signed-in user soft-delete a sign-off after confirming', async () => {
    const { api } = setup('JT');
    await screen.findByRole('list', { name: 'Sign-offs' });
    const deleteButton = await screen.findByRole('button', {
      name: /Delete sign-off: .*cat/i,
    });
    await userEvent.click(deleteButton);

    const dialog = await screen.findByRole('dialog', { name: 'Delete this sign-off?' });
    expect(
      api.callsTo('DELETE /api/completions/00000000-0000-4000-8000-0000000000a2'),
    ).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(
        api.callsTo('DELETE /api/completions/00000000-0000-4000-8000-0000000000a2'),
      ).toHaveLength(1),
    );
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sign-off deleted'));
  });
});
