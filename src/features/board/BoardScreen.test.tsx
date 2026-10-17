import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFakeApi,
  deferred,
  jsonResponse,
  makeCompletion,
  type FakeApi,
} from '../../api/test-utils';
import { makeOneOff, makeTask } from '../../domain/test-fixtures';
import type { Completion, Task } from '../../shared/api-schemas';
import { renderScreen } from '../shared/test-utils';
import { BoardScreen } from './index';

const TODAY = '2026-10-07';

const TASKS: Task[] = [
  makeTask({ id: 'overdue-job', title: 'Prune the hedge' }),
  makeTask({ id: 'never-job', title: 'Clean the gutters' }),
  makeTask({ id: 'ok-job', title: 'Check the fence' }),
  makeTask({ id: 'daily-job', title: 'Feed the cats', intervalCount: 1, intervalUnit: 'day' }),
  makeOneOff('finished-job', null),
];

function latest(): Completion[] {
  return [
    makeCompletion({ taskId: 'overdue-job', doneBy: 'Luis', doneOn: '2026-09-20' }),
    makeCompletion({ taskId: 'ok-job', doneBy: 'Luis', doneOn: '2026-10-06' }),
    makeCompletion({ taskId: 'daily-job', doneBy: 'Luis', doneOn: TODAY }),
    makeCompletion({ taskId: 'finished-job', doneBy: 'Luis', doneOn: '2026-10-05' }),
  ];
}

function setup(
  options: {
    me?: string | null;
    lang?: 'en' | 'es';
    tasks?: Task[];
    latest?: Completion[];
    week?: Completion[];
    api?: FakeApi;
  } = {},
) {
  const api = options.api ?? createFakeApi();
  if (!options.api) api.on('GET /api/tasks', { tasks: options.tasks ?? TASKS });
  api.on('GET /api/completions/latest', { completions: options.latest ?? latest() });
  api.on('GET /api/completions', {
    completions: options.week ?? [
      makeCompletion({ doneOn: '2026-10-06' }),
      makeCompletion({ doneOn: TODAY, partial: true, note: 'half' }),
    ],
  });
  return renderScreen(<BoardScreen />, {
    me: options.me === undefined ? 'JT' : options.me,
    lang: options.lang ?? 'en',
    api,
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z')); // 09:00 in Costa Rica
});
afterEach(() => vi.useRealTimers());

describe('BoardScreen', () => {
  it('renders task statuses from the API and skips finished one-offs', async () => {
    setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Good morning, JT' }),
    ).toBeInTheDocument();

    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    const hedge = within(attention).getByRole('link', { name: 'Prune the hedge' }).closest('li')!;
    expect(within(hedge).getByText('Overdue')).toBeInTheDocument();
    expect(hedge).toHaveTextContent('3 days overdue');
    const gutters = within(attention)
      .getByRole('link', { name: 'Clean the gutters' })
      .closest('li')!;
    expect(within(gutters).getByText('Never done')).toBeInTheDocument();
    expect(
      within(attention).queryByRole('link', { name: 'Check the fence' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /finished-job/ })).not.toBeInTheDocument();

    const daily = screen.getByRole('list', { name: 'Today’s daily jobs' });
    const cats = within(daily).getByRole('link', { name: 'Feed the cats' }).closest('li')!;
    expect(cats).toHaveAttribute('data-done', 'true');

    const stats = screen.getByRole('region', { name: 'At a glance' });
    expect(within(stats).getByText('Overdue').parentElement!.parentElement).toHaveTextContent(
      'Overdue2incl. never done',
    );
  });

  it('"Done this week" counts full sign-offs only', async () => {
    setup();
    const stats = await screen.findByRole('region', { name: 'At a glance' });
    await waitFor(() =>
      expect(
        within(stats).getByText('Done this week').parentElement!.parentElement,
      ).toHaveTextContent('Done this week1since Monday'),
    );
  });

  it('shows a task with only a partial sign-off as In progress under Needs attention', async () => {
    setup({
      tasks: [makeTask({ id: 'chapia', title: 'Chapia' })],
      latest: [
        makeCompletion({
          taskId: 'chapia',
          doneOn: TODAY,
          doneBy: 'Dario',
          partial: true,
          note: 'Half the lawn',
        }),
      ],
    });
    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    const row = within(attention).getByRole('link', { name: 'Chapia' }).closest('li')!;
    expect(within(row).getByText('In progress')).toBeInTheDocument();
    expect(within(row).getByText('Never done')).toBeInTheDocument();
  });

  it('keeps the schedule of the last full sign-off when a newer partial exists', async () => {
    setup({
      tasks: [makeTask({ id: 'chapia', title: 'Chapia' })],
      latest: [
        makeCompletion({ taskId: 'chapia', doneOn: '2026-10-06', doneBy: 'Dario' }),
        makeCompletion({
          taskId: 'chapia',
          doneOn: TODAY,
          doneBy: 'Dario',
          partial: true,
          note: 'Edges left',
        }),
      ],
    });
    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    const row = within(attention).getByRole('link', { name: 'Chapia' }).closest('li')!;
    expect(within(row).getByText('In progress')).toBeInTheDocument();
    expect(within(row).getByText('On track')).toBeInTheDocument();
    // Next due comes from the full sign-off on 10-06 (14 days later), not from the partial.
    expect(row).toHaveTextContent('Due in 13 days');
  });

  it('signs off a task from its row and posts the right payload', async () => {
    const { api, user } = setup();
    api.on('POST /api/completions', ({ body }) => {
      const created = makeCompletion(body as object);
      // The server now reports the new sign-off as the latest for that task.
      api.on('GET /api/completions/latest', {
        completions: [...latest().filter((c) => c.taskId !== created.taskId), created],
      });
      return jsonResponse(created, 201);
    });

    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    const row = within(attention).getByRole('link', { name: 'Prune the hedge' }).closest('li')!;
    // The row's button names the job, so a screen reader can tell the rows apart.
    await user.click(within(row).getByRole('button', { name: 'Sign off: Prune the hedge' }));

    const dialog = await screen.findByRole('dialog', { name: 'Sign off work' });
    expect(dialog).toHaveTextContent('Prune the hedge');
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: /Done by/ })).toHaveValue('JT'),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Sign off' }));

    await waitFor(() => expect(api.callsTo('POST /api/completions')).toHaveLength(1));
    expect(api.callsTo('POST /api/completions')[0]!.body).toMatchObject({
      taskId: 'overdue-job',
      doneOn: TODAY,
      doneBy: 'JT',
    });
    // Optimistic: the row leaves the attention list straight away.
    await waitFor(() =>
      expect(
        within(attention).queryByRole('link', { name: 'Prune the hedge' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('shows sign-in prompts instead of sign-off buttons when signed out', async () => {
    setup({ me: null });
    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    await waitFor(() =>
      expect(
        within(attention).getAllByRole('link', { name: 'Sign in to sign off' }).length,
      ).toBeGreaterThan(0),
    );
    expect(within(attention).queryByRole('button', { name: /^Sign off/ })).not.toBeInTheDocument();
    expect(screen.getByText('You’re looking around read-only')).toBeInTheDocument();
  });

  it('speaks Spanish, including task text', async () => {
    setup({
      lang: 'es',
      tasks: [makeTask({ id: 'overdue-job', title: 'Prune', titleEs: 'Podar el seto' })],
      latest: [makeCompletion({ taskId: 'overdue-job', doneOn: '2026-09-20' })],
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Buenos días, JT' }),
    ).toBeInTheDocument();
    const attention = await screen.findByRole('list', { name: 'Trabajos que requieren atención' });
    expect(within(attention).getByText('Atrasada')).toBeInTheDocument();
    expect(within(attention).getByRole('link', { name: 'Podar el seto' })).toBeInTheDocument();
  });

  it('shows the load error and no percentage when the task list fails', async () => {
    const api = createFakeApi();
    api.on('GET /api/tasks', jsonResponse({ error: 'boom' }, 500));
    setup({ api });
    expect(
      await screen.findByText('Couldn’t load this. Pull to refresh or try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText('On track')).not.toBeInTheDocument();
  });

  it('shows the loading skeleton and no percentage while the task list is pending', async () => {
    const api = createFakeApi();
    const pending = deferred<Response>();
    api.on('GET /api/tasks', () => pending.promise);
    setup({ api });
    const stats = await screen.findByRole('region', { name: 'At a glance' });
    await waitFor(() => expect(api.callsTo('GET /api/completions/latest')).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(within(stats).getByLabelText('Loading…')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();

    pending.resolve(jsonResponse({ tasks: TASKS }));
    await waitFor(() => expect(within(stats).getByText('On track')).toBeInTheDocument());
  });
});
