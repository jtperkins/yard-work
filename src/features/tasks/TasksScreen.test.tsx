import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi, jsonResponse, makeCompletion } from '../../api/test-utils';
import { makeOneOff, makeTask } from '../../domain/test-fixtures';
import type { Task } from '../../shared/api-schemas';
import { renderScreen } from '../shared/test-utils';
import { TaskDetailScreen, TasksScreen } from './index';

const chapia = makeTask({
  id: 'chapia',
  title: 'Chapia (mow and weed-eat)',
  titleEs: 'Chapia (cortar el zacate)',
  steps: ['Mow the lawn to about 5 cm.', 'Rake up the cuttings.'],
  stepsEs: ['Corte el zacate a unos 5 cm.'],
  safety: 'Closed shoes and eye protection.',
  priority: 'high',
});
const rust = makeTask({
  id: 'rust-inspection',
  title: 'Spot-treat rust',
  intervalCount: 6,
  intervalUnit: 'month',
});
const latch = makeOneOff('fix-latch', null);
const gate = makeOneOff('paint-gate', null);
const oldJob = makeTask({
  id: 'old-job',
  title: 'Paint the old shed',
  archivedAt: '2026-10-01T00:00:00Z',
});

const active: Task[] = [
  chapia,
  rust,
  { ...latch, title: 'Fix the latch' },
  { ...gate, title: 'Paint the gate' },
];

function api() {
  const fake = createFakeApi();
  fake.on('GET /api/tasks', (call) =>
    jsonResponse({ tasks: call.search.get('archived') === '1' ? [...active, oldJob] : active }),
  );
  fake.on('GET /api/completions/latest', {
    completions: [
      makeCompletion({ taskId: 'chapia', doneOn: '2026-10-06', doneBy: 'Luis' }),
      makeCompletion({ taskId: 'paint-gate', doneOn: '2026-10-05', doneBy: 'JT' }),
    ],
  });
  return fake;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('TasksScreen', () => {
  it('lists open tasks with their interval and last sign-off, hiding finished and archived ones', async () => {
    renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    expect(screen.getByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Tasks' });
    const row = await within(list).findByRole('link', { name: /Chapia \(mow and weed-eat\)/ });
    expect(row).toHaveAttribute('href', '/tasks/chapia');
    await waitFor(() =>
      expect(row).toHaveTextContent('Every 14 days · Last done yesterday by Luis'),
    );
    expect(row).toHaveTextContent('On track');
    expect(within(list).getByRole('link', { name: /Spot-treat rust/ })).toHaveTextContent(
      'Every 6 months',
    );
    expect(within(list).getByRole('link', { name: /Fix the latch/ })).toHaveTextContent('One-off');
    expect(within(list).queryByRole('link', { name: /Paint the gate/ })).not.toBeInTheDocument();
    expect(
      within(list).queryByRole('link', { name: /Paint the old shed/ }),
    ).not.toBeInTheDocument();
  });

  it('the Done filter shows only finished one-offs', async () => {
    const { user, location } = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await screen.findByRole('link', { name: /Spot-treat rust/ });
    await waitFor(() => expect(screen.queryByRole('link', { name: /Paint the gate/ })).toBeNull());
    await user.selectOptions(screen.getByLabelText('Show'), 'Done');
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('link')).toHaveLength(1);
    expect(within(list).getByRole('link', { name: /Paint the gate/ })).toBeInTheDocument();
    expect(location()).toBe('/tasks?filter=done');
  });

  it('the One-off and Recurring filters split by kind', async () => {
    const { user } = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await screen.findByRole('link', { name: /Spot-treat rust/ });
    await user.selectOptions(screen.getByLabelText('Show'), 'One-off');
    expect(within(screen.getByRole('list', { name: 'Tasks' })).getAllByRole('link')).toHaveLength(
      1,
    );
    await user.selectOptions(screen.getByLabelText('Show'), 'Recurring');
    expect(within(screen.getByRole('list', { name: 'Tasks' })).getAllByRole('link')).toHaveLength(
      2,
    );
  });

  it('the Archived filter lists archived tasks with a link to their page', async () => {
    const { user } = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await screen.findByRole('link', { name: /Spot-treat rust/ });
    await user.selectOptions(screen.getByLabelText('Show'), 'Archived');
    const link = await screen.findByRole('link', { name: /Paint the old shed/ });
    expect(link).toHaveAttribute('href', '/tasks/old-job');
    expect(link).toHaveTextContent('Archived');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('filters by search text in either language, accents ignored', async () => {
    const { user, location } = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await screen.findByRole('link', { name: /Spot-treat rust/ });
    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'zacate');
    const links = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(links).toEqual(['/tasks/chapia']);
    expect(location()).toBe('/tasks?q=zacate');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('link').length).toBeGreaterThan(1);
  });

  it('shows an empty state when nothing matches', async () => {
    const { user } = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await screen.findByRole('link', { name: /Spot-treat rust/ });
    await user.type(screen.getByRole('searchbox'), 'helicopter');
    expect(screen.getByText('No tasks match')).toBeInTheDocument();
  });

  it('offers New task only when signed in', async () => {
    const out = renderScreen(<TasksScreen />, { api: api(), path: '/tasks' });
    await screen.findByRole('link', { name: /Spot-treat rust/ });
    expect(screen.queryByRole('link', { name: 'New task' })).not.toBeInTheDocument();
    out.unmount();

    renderScreen(<TasksScreen />, { api: api(), path: '/tasks', me: 'JT' });
    expect(await screen.findByRole('link', { name: 'New task' })).toHaveAttribute(
      'href',
      '/tasks/new',
    );
  });

  it('shows an error, not an empty list, when the task list fails', async () => {
    const fake = createFakeApi();
    fake.on('GET /api/tasks', jsonResponse({ error: 'boom' }, 500));
    fake.on('GET /api/completions/latest', { completions: [] });
    renderScreen(<TasksScreen />, { api: fake, path: '/tasks' });
    expect(
      await screen.findByText('Couldn’t load this. Pull to refresh or try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
  });
});

describe('TaskDetailScreen', () => {
  function renderDetail(id: string, me: string | null = 'JT') {
    const fake = api();
    fake.on('GET /api/tasks/chapia', { task: chapia });
    fake.on('GET /api/tasks/old-job', { task: oldJob });
    fake.on('GET /api/tasks/fix-latch', { task: latch });
    fake.on('GET /api/completions', {
      completions: [
        makeCompletion({
          taskId: 'chapia',
          doneOn: '2026-10-06',
          doneBy: 'Luis',
          loggedBy: 'JT',
          note: 'Front only',
        }),
        makeCompletion({
          taskId: 'chapia',
          doneOn: '2026-10-07',
          doneBy: 'Dario',
          loggedBy: 'JT',
          partial: true,
          note: 'Edges left',
        }),
        makeCompletion({ taskId: 'chapia', doneOn: '2026-09-29', doneBy: 'JT', loggedBy: 'JT' }),
      ],
    });
    return renderScreen(<TaskDetailScreen />, {
      api: fake,
      me,
      path: `/tasks/${id}`,
      route: '/tasks/:id',
    });
  }

  it('shows steps, safety, facts, in-progress note and history with a Partial badge', async () => {
    const { api: fake } = renderDetail('chapia');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Chapia (mow and weed-eat)' }),
    ).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Steps' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Safety first')).toBeInTheDocument();
    expect(screen.getByText('Closed shoes and eye protection.')).toBeInTheDocument();
    expect(screen.getByText('Every 14 days')).toBeInTheDocument();

    const history = await screen.findByRole('list', { name: 'Sign-offs for this task' });
    expect(within(history).getAllByRole('listitem')).toHaveLength(3);
    expect(history).toHaveTextContent('Done by Luis · signed by JT');
    expect(within(history).getAllByText('Partial')).toHaveLength(1);
    expect(await screen.findByText(/In progress since Oct 7: Edges left/)).toBeInTheDocument();
    const call = fake.callsTo('GET /api/completions')[0]!;
    expect(call.search.get('task')).toBe('chapia');
    expect(call.search.get('to')).toBe('2026-10-07');
    expect(await screen.findByRole('button', { name: 'Sign off' })).toBeInTheDocument();
  });

  it('shows the Spanish title and steps when the UI is Spanish, English as a fallback', async () => {
    const fake = api();
    fake.on('GET /api/tasks/chapia', { task: chapia });
    fake.on('GET /api/completions', { completions: [] });
    renderScreen(<TaskDetailScreen />, {
      api: fake,
      lang: 'es',
      path: '/tasks/chapia',
      route: '/tasks/:id',
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Chapia (cortar el zacate)' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Pasos' })).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('offers sign-in instead of sign-off and no edit controls when signed out', async () => {
    renderDetail('chapia', null);
    expect(await screen.findByRole('link', { name: 'Sign in to sign off' })).toHaveAttribute(
      'href',
      '/login?next=%2Ftasks%2Fchapia',
    );
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('opens the sign-off sheet for the task and links to the edit form', async () => {
    const { user } = renderDetail('chapia');
    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/tasks/chapia/edit',
    );
    await user.click(await screen.findByRole('button', { name: 'Sign off' }));
    expect(await screen.findByRole('dialog', { name: 'Sign off work' })).toHaveTextContent(
      'Chapia (mow and weed-eat)',
    );
  });

  it('an archived task still loads and offers Unarchive', async () => {
    const { api: fake, user } = renderDetail('old-job');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Paint the old shed' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This task is archived')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
    fake.on('PATCH /api/tasks/old-job', { task: { ...oldJob, archivedAt: null } });
    await user.click(screen.getByRole('button', { name: 'Unarchive' }));
    await waitFor(() => expect(fake.callsTo('PATCH /api/tasks/old-job')).toHaveLength(1));
    expect(fake.callsTo('PATCH /api/tasks/old-job')[0]!.body).toEqual({ archived: false });
  });

  it('a finished one-off says when it was done and hides Sign off', async () => {
    const fake = api();
    fake.on('GET /api/tasks/paint-gate', { task: gate });
    fake.on('GET /api/completions', {
      completions: [makeCompletion({ taskId: 'paint-gate', doneOn: '2026-10-05' })],
    });
    renderScreen(<TaskDetailScreen />, {
      api: fake,
      me: 'JT',
      path: '/tasks/paint-gate',
      route: '/tasks/:id',
    });
    expect(await screen.findByText(/Mon, Oct 5, 2026/, { selector: 'div,p' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
  });

  it('handles unknown task ids', async () => {
    renderDetail('nope');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Task not found' }),
    ).toBeInTheDocument();
  });
});
