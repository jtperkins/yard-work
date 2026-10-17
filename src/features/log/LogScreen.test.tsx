import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, makeCompletion } from '../../api/test-utils';
import { makeTask } from '../../domain/test-fixtures';
import { downloadTextFile } from './download';
import { LogScreen } from './LogScreen';
import { renderScreen } from './screen-test-utils';

vi.mock('./download', () => ({ downloadTextFile: vi.fn() }));

const tasks = [
  makeTask({ id: 'chapia', title: 'Chapia' }),
  makeTask({ id: 'sweep-patio', title: 'Sweep the patio' }),
];
/** Only returned by `GET /api/tasks?archived=1`. */
const archivedTask = makeTask({
  id: 'old-job',
  title: 'Paint the old shed',
  archivedAt: '2026-10-01T00:00:00Z',
});

const rows = [
  makeCompletion({
    id: '00000000-0000-4000-8000-0000000000a1',
    taskId: 'chapia',
    doneOn: '2026-10-06',
    doneBy: 'Yard worker',
    loggedBy: 'JT',
    note: 'Back slope, "careful" of the ditch',
    createdAt: '2026-10-06T20:00:00.000Z',
  }),
  makeCompletion({
    id: '00000000-0000-4000-8000-0000000000a2',
    taskId: 'sweep-patio',
    doneOn: '2026-10-05',
    doneBy: 'JT',
    loggedBy: 'JT',
    note: null,
    createdAt: '2026-10-05T13:00:00.000Z',
  }),
];

function setup(user: string | null, path = '/log', extraRows: typeof rows = []) {
  return renderScreen(<LogScreen />, {
    path,
    route: '/log',
    user,
    routes: (api) => {
      api.on('GET /api/completions', () => jsonResponse({ completions: [...rows, ...extraRows] }));
      api.on('GET /api/tasks', (call) =>
        jsonResponse({
          tasks: call.search.get('archived') === '1' ? [...tasks, archivedTask] : tasks,
        }),
      );
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
    expect(lines[0]).toBe('Date,Task,Partial,Done by,Signed by,Note,Task ID,Logged at (UTC)');
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
    expect(csv).toContain('sweep-patio');
  });

  it('shows the filtered empty state and disables export when nothing matches', async () => {
    setup(null, '/log?person=Nobody');
    expect(await screen.findByText('Nothing matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('marks partial sign-offs with a Partial badge', async () => {
    setup(null, '/log', [
      makeCompletion({
        id: '00000000-0000-4000-8000-0000000000a3',
        taskId: 'chapia',
        doneOn: '2026-10-06',
        partial: true,
        note: 'Edges left',
        createdAt: '2026-10-06T22:00:00.000Z',
      }),
    ]);
    const list = await screen.findByRole('list', { name: 'Sign-offs' });
    expect(within(list).getAllByText('Partial')).toHaveLength(1);
    expect(within(list).getByText('Edges left')).toBeInTheDocument();
  });

  it('names the task of an archived task, not its id, in the list and the CSV', async () => {
    setup(null, '/log', [
      makeCompletion({
        id: '00000000-0000-4000-8000-0000000000a4',
        taskId: 'old-job',
        doneOn: '2026-10-04',
        createdAt: '2026-10-04T10:00:00.000Z',
      }),
    ]);
    const list = await screen.findByRole('list', { name: 'Sign-offs' });
    expect(
      await within(list).findByRole('link', { name: 'Paint the old shed' }),
    ).toBeInTheDocument();
    expect(within(list).queryByText('old-job')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const csv = vi.mocked(downloadTextFile).mock.calls[0]![1];
    expect(csv).toContain('Paint the old shed');
  });

  it('lets a signed-in user soft-delete a sign-off after confirming', async () => {
    const { api } = setup('JT');
    await screen.findByRole('list', { name: 'Sign-offs' });
    const deleteButton = await screen.findByRole('button', {
      name: /Delete sign-off: Sweep the patio/,
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
