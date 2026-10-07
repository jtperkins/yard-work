import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi, jsonResponse, makeCompletion } from '../../api/test-utils';
import { getCatalog } from '../../domain/catalog';
import type { Completion } from '../../shared/api-schemas';
import { renderScreen } from '../shared/test-utils';
import { BoardScreen } from './index';

const TODAY = '2026-10-07';

/** Every task done yesterday, except: mow-lawn overdue, vet-checkup never, cat care done today. */
function latestCompletions(): Completion[] {
  return getCatalog()
    .tasks.filter((t) => t.id !== 'vet-checkup')
    .map((t) =>
      makeCompletion({
        taskId: t.id,
        doneBy: 'Luis',
        doneOn:
          t.id === 'mow-lawn' ? '2026-09-20' : t.id === 'daily-cat-care' ? TODAY : '2026-10-06',
      }),
    );
}

function setup(me: string | null = 'JT', lang: 'en' | 'es' = 'en') {
  const api = createFakeApi();
  api.on('GET /api/completions/latest', { completions: latestCompletions() });
  api.on('GET /api/completions', {
    completions: [makeCompletion({ doneOn: '2026-10-06' }), makeCompletion({ doneOn: TODAY })],
  });
  return renderScreen(<BoardScreen />, { me, lang, api });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z')); // 09:00 in Costa Rica
});
afterEach(() => vi.useRealTimers());

describe('BoardScreen', () => {
  it('renders task statuses from the API', async () => {
    setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Good morning, JT' }),
    ).toBeInTheDocument();

    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    const mow = within(attention)
      .getByRole('link', { name: 'Mow the lawn (chapia)' })
      .closest('li')!;
    expect(within(mow).getByText('Overdue')).toBeInTheDocument();
    expect(mow).toHaveTextContent('10 days overdue');
    const vet = within(attention)
      .getByRole('link', { name: 'Vet checkup & vaccines' })
      .closest('li')!;
    expect(within(vet).getByText('Never done')).toBeInTheDocument();
    // On-track tasks are not in the attention list
    expect(
      within(attention).queryByRole('link', { name: /Rust inspection/ }),
    ).not.toBeInTheDocument();

    const daily = screen.getByRole('list', { name: 'Today’s daily jobs' });
    const cats = within(daily).getByRole('link', { name: 'Daily cat care' }).closest('li')!;
    expect(cats).toHaveAttribute('data-done', 'true');

    const stats = screen.getByRole('region', { name: 'At a glance' });
    await waitFor(() =>
      expect(
        within(stats).getByText('Done this week').parentElement!.parentElement,
      ).toHaveTextContent('Done this week2since Monday'),
    );
    expect(within(stats).getByText('Overdue').parentElement!.parentElement).toHaveTextContent(
      'Overdue2incl. never done',
    );
  });

  it('signs off a task from its row and posts the right payload', async () => {
    const { api, user } = setup();
    api.on('POST /api/completions', ({ body }) => {
      const created = makeCompletion(body as object);
      // The server now reports the new sign-off as the latest for that task.
      api.on('GET /api/completions/latest', {
        completions: [...latestCompletions().filter((c) => c.taskId !== created.taskId), created],
      });
      return jsonResponse(created, 201);
    });

    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    const mow = within(attention)
      .getByRole('link', { name: 'Mow the lawn (chapia)' })
      .closest('li')!;
    // The row's button names the job, so a screen reader can tell the rows apart.
    await user.click(within(mow).getByRole('button', { name: 'Sign off: Mow the lawn (chapia)' }));

    const dialog = await screen.findByRole('dialog', { name: 'Sign off work' });
    expect(dialog).toHaveTextContent('Mow the lawn (chapia)');
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: /Done by/ })).toHaveValue('JT'),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Sign off' }));

    await waitFor(() => expect(api.callsTo('POST /api/completions')).toHaveLength(1));
    expect(api.callsTo('POST /api/completions')[0]!.body).toMatchObject({
      taskId: 'mow-lawn',
      doneOn: TODAY,
      doneBy: 'JT',
    });
    // Optimistic: the row leaves the attention list straight away.
    await waitFor(() =>
      expect(
        within(attention).queryByRole('link', { name: 'Mow the lawn (chapia)' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('shows sign-in prompts instead of sign-off buttons when signed out', async () => {
    setup(null);
    const attention = await screen.findByRole('list', { name: 'Jobs that need attention' });
    await waitFor(() =>
      expect(
        within(attention).getAllByRole('link', { name: 'Sign in to sign off' }).length,
      ).toBeGreaterThan(0),
    );
    expect(within(attention).queryByRole('button', { name: /^Sign off/ })).not.toBeInTheDocument();
    expect(screen.getByText('You’re looking around read-only')).toBeInTheDocument();
  });

  it('speaks Spanish, including catalog text', async () => {
    setup('JT', 'es');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Buenos días, JT' }),
    ).toBeInTheDocument();
    const attention = await screen.findByRole('list', { name: 'Trabajos que requieren atención' });
    expect(within(attention).getByText('Atrasada')).toBeInTheDocument();
  });
});
