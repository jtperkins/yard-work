import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi, jsonResponse, makeCompletion, makePlanItem } from '../../api/test-utils';
import { getCatalog } from '../../domain/catalog';
import type { PlanItem } from '../../shared/api-schemas';
import { renderScreen } from '../shared/test-utils';
import { supplyTicksKey } from './supplyTicks';
import { WeekScreen } from './index';

const MONDAY = '2026-10-05';
const ROUTE = '/week/:weekStart?';

function setup({ me = 'JT', items }: { me?: string | null; items?: PlanItem[] } = {}) {
  const api = createFakeApi();
  // Everything recently done except the lawn (overdue) — keeps suggestions short.
  const latest = getCatalog()
    .tasks.filter((t) => t.id !== 'mow-lawn')
    .map((t) => makeCompletion({ taskId: t.id, doneOn: '2026-10-06' }));
  api.on('GET /api/completions/latest', { completions: latest });
  const planItems: PlanItem[] = items ?? [
    makePlanItem({
      id: '00000000-0000-4000-8000-0000000000a1',
      taskId: 'rust-inspection',
      assignee: 'Luis',
    }),
    makePlanItem({
      id: '00000000-0000-4000-8000-0000000000a2',
      taskId: null,
      title: 'Fix the gate latch',
    }),
    makePlanItem({
      id: '00000000-0000-4000-8000-0000000000a3',
      taskId: 'trash-out',
      status: 'done',
      completion: {
        id: '00000000-0000-4000-8000-0000000000c3',
        doneOn: '2026-10-06',
        doneBy: 'Ana',
      },
    }),
  ];
  api.on('GET /api/plan', () => jsonResponse({ items: planItems }));
  // POSTs persist, so the refetch after a mutation sees them.
  api.on('POST /api/plan', ({ body }) => {
    const created = makePlanItem({ taskId: null, ...(body as object) });
    planItems.push(created);
    return jsonResponse(created, 201);
  });
  return renderScreen(<WeekScreen />, { me, api, path: `/week/${MONDAY}`, route: ROUTE });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe('WeekScreen', () => {
  it('shows the plan with assignees, done stamps and the yard day', async () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'This week' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Planned jobs' });
    const rust = within(list)
      .getByRole('link', { name: 'Rust inspection & spot-treat' })
      .closest('li')!;
    expect(rust).toHaveTextContent('For Luis');
    expect(within(list).getByText('Fix the gate latch')).toBeInTheDocument();
    const trash = within(list).getByRole('link', { name: 'Trash & recycling out' }).closest('li')!;
    expect(trash).toHaveAttribute('data-done', 'true');
    expect(trash).toHaveTextContent('Done by Ana');
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();

    const strip = screen.getByRole('list', { name: 'Days of this week' });
    expect(
      within(strip).getByRole('listitem', { name: /Thursday, October 8 — yard day/ }),
    ).toBeInTheDocument();
  });

  it('normalises a non-Monday date to its week', async () => {
    const r = renderScreen(<WeekScreen />, { path: '/week/2026-10-08', route: ROUTE });
    await waitFor(() => expect(r.location()).toBe('/week/2026-10-05'));
  });

  it('adds a suggestion to the plan', async () => {
    const { api, user } = setup();
    const suggestions = await screen.findByRole('list', { name: 'Suggested jobs' });
    await user.click(
      within(suggestions).getByRole('button', { name: 'Add Mow the lawn (chapia) to the plan' }),
    );
    await waitFor(() => expect(api.callsTo('POST /api/plan')).toHaveLength(1));
    expect(api.callsTo('POST /api/plan')[0]!.body).toMatchObject({
      weekStart: MONDAY,
      taskId: 'mow-lawn',
    });
    // Optimistically on the plan
    const list = screen.getByRole('list', { name: 'Planned jobs' });
    expect(
      await within(list).findByRole('link', { name: 'Mow the lawn (chapia)' }),
    ).toBeInTheDocument();
  });

  it('adds an ad-hoc job', async () => {
    const { api, user } = setup();
    await screen.findByRole('list', { name: 'Planned jobs' });
    await user.type(
      screen.getByRole('textbox', { name: /Add something else/ }),
      'Wash the car{Enter}',
    );
    await waitFor(() => expect(api.callsTo('POST /api/plan')).toHaveLength(1));
    expect(api.callsTo('POST /api/plan')[0]!.body).toMatchObject({
      weekStart: MONDAY,
      title: 'Wash the car',
    });
  });

  it('signs off a planned job with its plan item and assignee', async () => {
    const { api, user } = setup();
    api.on('POST /api/completions', ({ body }) =>
      jsonResponse(makeCompletion(body as object), 201),
    );
    const list = await screen.findByRole('list', { name: 'Planned jobs' });
    const rust = within(list)
      .getByRole('link', { name: 'Rust inspection & spot-treat' })
      .closest('li')!;
    await user.click(
      within(rust).getByRole('button', { name: 'Sign off: Rust inspection & spot-treat' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Sign off work' });
    expect(within(dialog).getByRole('combobox', { name: /Done by/ })).toHaveValue('Luis');
    await user.click(within(dialog).getByRole('button', { name: 'Sign off' }));
    await waitFor(() => expect(api.callsTo('POST /api/completions')).toHaveLength(1));
    expect(api.callsTo('POST /api/completions')[0]!.body).toMatchObject({
      taskId: 'rust-inspection',
      doneBy: 'Luis',
      planItemId: '00000000-0000-4000-8000-0000000000a1',
    });
  });

  it('skips a job from the edit sheet', async () => {
    const { api, user } = setup();
    api.on('PATCH /api/plan/00000000-0000-4000-8000-0000000000a2', ({ body }) =>
      jsonResponse(
        makePlanItem({
          id: '00000000-0000-4000-8000-0000000000a2',
          taskId: null,
          title: 'Fix the gate latch',
          ...(body as object),
        }),
      ),
    );
    await screen.findByRole('list', { name: 'Planned jobs' });
    await user.click(screen.getByRole('button', { name: 'Edit Fix the gate latch' }));
    await user.click(await screen.findByRole('button', { name: 'Skip this week' }));
    await waitFor(() =>
      expect(api.callsTo('PATCH /api/plan/00000000-0000-4000-8000-0000000000a2')[0]?.body).toEqual({
        status: 'skipped',
      }),
    );
  });

  it('lists supplies and remembers "have it" ticks per week on this device', async () => {
    const { user } = setup();
    const supplies = await screen.findByRole('region', { name: 'Supplies needed' });
    const brush = await within(supplies).findByRole('checkbox', { name: /Wire brush/ });
    expect(within(supplies).getAllByText(/For: Rust inspection/).length).toBeGreaterThan(0);
    await user.click(brush);
    expect(brush).toBeChecked();
    expect(JSON.parse(localStorage.getItem(supplyTicksKey(MONDAY))!)).toContain('wire-brush');
  });

  it('builds a Spanish WhatsApp message by default, switchable to English', async () => {
    const { user } = setup();
    await screen.findByRole('list', { name: 'Planned jobs' });
    const link = screen.getByRole('link', { name: 'Send on WhatsApp' });
    await waitFor(() =>
      expect(decodeURIComponent(link.getAttribute('href')!)).toContain('Revisión de óxido'),
    );
    const text = decodeURIComponent(link.getAttribute('href')!.replace('https://wa.me/?text=', ''));
    expect(text).toContain('Día del jardinero: jueves, 8 oct');
    expect(text).toContain('☐ Revisión de óxido y retoque — Luis');
    expect(text).toContain('✅');
    await user.click(screen.getByRole('radio', { name: 'English' }));
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain(
      'Rust inspection & spot-treat — Luis',
    );
  });

  it('is read-only when signed out', async () => {
    setup({ me: null });
    const list = await screen.findByRole('list', { name: 'Planned jobs' });
    await waitFor(() =>
      expect(
        within(list).getAllByRole('link', { name: 'Sign in to sign off' }).length,
      ).toBeGreaterThan(0),
    );
    expect(within(list).queryByRole('button', { name: /^Sign off/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Add something else/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Add/ })).not.toBeInTheDocument();
  });
});
