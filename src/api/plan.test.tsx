import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Me, PlanItem } from '../shared/api-schemas';
import { isConflict } from './errors';
import { queryKeys } from './keys';
import {
  useAddPlanItem,
  useRemovePlanItem,
  useUpdatePlanItem,
  useWeekPlan,
  useWeekSuggestions,
  weeksBefore,
  PLAN_AHEAD_WEEKS,
} from './plan';
import { deferred, jsonResponse, makeCompletion, makePlanItem, setupApi } from './test-utils';

const WEEK = queryKeys.plan.week('2026-10-05');

function seeded(items: PlanItem[]) {
  const env = setupApi();
  env.qc.setQueryData<Me>(queryKeys.me(), { name: 'JT' });
  env.qc.setQueryData<PlanItem[]>(WEEK, items);
  return env;
}

describe('useWeekPlan', () => {
  it('normalises any date to its Monday', async () => {
    const env = setupApi();
    env.api.on('GET /api/plan', { items: [] });
    const { result } = renderHook(() => useWeekPlan('2026-10-08'), { wrapper: env.wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(env.api.calls[0]?.search.get('week')).toBe('2026-10-05');
  });

  it('stays idle for a malformed date', () => {
    const env = setupApi();
    const { result } = renderHook(() => useWeekPlan('not-a-date'), { wrapper: env.wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(env.api.calls).toHaveLength(0);
  });
});

describe('useWeekSuggestions', () => {
  it('suggests due tasks not already on the plan, without daily tasks', async () => {
    const env = setupApi();
    env.api.on('GET /api/completions/latest', { completions: [] });
    env.api.on('GET /api/plan', { items: [makePlanItem({ taskId: 'mow-lawn' })] });
    const { result } = renderHook(() => useWeekSuggestions('2026-10-05', { today: '2026-10-07' }), {
      wrapper: env.wrapper,
    });
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.data).toBeDefined());

    const ids = result.current.data!.map((s) => s.task.id);
    expect(ids).toContain('trash-out');
    expect(ids).not.toContain('mow-lawn');
    expect(ids).not.toContain('daily-cat-care');
    expect(ids).not.toContain('repaint-metal'); // dormant in the rainy season
    expect(result.current.isError).toBe(false);
  });

  it('reads the weeks in between when planning ahead, so planned work is not suggested twice', async () => {
    const env = setupApi();
    env.api.on('GET /api/completions/latest', {
      completions: [makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-10-01' })],
    });
    env.api.on('GET /api/plan', (call) =>
      jsonResponse({
        items:
          call.search.get('week') === '2026-10-05'
            ? [makePlanItem({ weekStart: '2026-10-05', taskId: 'trash-out' })]
            : [],
      }),
    );
    const { result } = renderHook(() => useWeekSuggestions('2026-10-12', { today: '2026-10-07' }), {
      wrapper: env.wrapper,
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(env.api.callsTo('GET /api/plan').map((c) => c.search.get('week'))).toEqual(
      expect.arrayContaining(['2026-10-05', '2026-10-12']),
    );
    const trash = result.current.data!.find((s) => s.task.id === 'trash-out');
    // Planned this week (projected on the yard day) → due again a week later, not overdue.
    expect(trash).toMatchObject({ dueOn: '2026-10-15', status: { state: 'ok' } });
  });
});

describe('weeksBefore', () => {
  it('lists this week up to the viewed one, capped', () => {
    expect(weeksBefore('2026-10-05', '2026-10-07')).toEqual([]);
    expect(weeksBefore('2026-10-19', '2026-10-07')).toEqual(['2026-10-05', '2026-10-12']);
    const far = weeksBefore('2027-06-07', '2026-10-07');
    expect(far).toHaveLength(PLAN_AHEAD_WEEKS);
    expect(far.at(-1)).toBe('2027-05-31');
  });
});

describe('useAddPlanItem', () => {
  it('adds the item optimistically with a client id, then keeps the server row', async () => {
    const existing = makePlanItem({ taskId: 'trash-out' });
    const env = seeded([existing]);
    const pending = deferred<Response>();
    env.api.on('POST /api/plan', () => pending.promise);
    const { result } = renderHook(() => useAddPlanItem(), { wrapper: env.wrapper });

    let id = '';
    act(() => {
      id = result.current.mutate({ weekStart: '2026-10-05', taskId: 'mow-lawn', assignee: ' ' });
    });
    await waitFor(() => expect(env.qc.getQueryData<PlanItem[]>(WEEK)).toHaveLength(2));
    expect(env.qc.getQueryData<PlanItem[]>(WEEK)?.[1]).toMatchObject({
      id,
      taskId: 'mow-lawn',
      assignee: null,
      status: 'planned',
      createdBy: 'JT',
    });

    const server = makePlanItem({ id, taskId: 'mow-lawn', createdAt: '2026-10-06T00:00:00.000Z' });
    pending.resolve(jsonResponse(server, 201));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(env.qc.getQueryData<PlanItem[]>(WEEK)?.find((i) => i.id === id)).toEqual(server);
    expect((env.api.callsTo('POST /api/plan')[0]?.body as { id: string }).id).toBe(id);
  });

  it('rolls back on a 409 duplicate', async () => {
    const existing = makePlanItem({ taskId: 'trash-out' });
    const env = seeded([existing]);
    env.api.on(
      'POST /api/plan',
      jsonResponse({ error: 'That task is already planned for this week' }, 409),
    );
    const { result } = renderHook(() => useAddPlanItem(), { wrapper: env.wrapper });

    act(() => {
      result.current.mutate({ weekStart: '2026-10-05', title: 'Fix gate latch' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isConflict(result.current.error)).toBe(true);
    expect(env.qc.getQueryData<PlanItem[]>(WEEK)).toEqual([existing]);
  });
});

describe('useUpdatePlanItem', () => {
  it('applies the patch optimistically and rolls back on error', async () => {
    const item = makePlanItem({ assignee: 'JT', note: 'front lawn only' });
    const env = seeded([item]);
    const pending = deferred<Response>();
    env.api.on(`PATCH /api/plan/${item.id}`, () => pending.promise);
    const { result } = renderHook(() => useUpdatePlanItem(), { wrapper: env.wrapper });

    act(() => result.current.mutate({ id: item.id, patch: { status: 'skipped', note: '' } }));
    await waitFor(() =>
      expect(env.qc.getQueryData<PlanItem[]>(WEEK)?.[0]).toMatchObject({
        status: 'skipped',
        note: null,
        assignee: 'JT',
      }),
    );
    expect(env.api.callsTo(`PATCH /api/plan/${item.id}`)[0]?.body).toEqual({
      status: 'skipped',
      note: '',
    });

    pending.resolve(jsonResponse({ error: 'That plan item is signed off' }, 409));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(env.qc.getQueryData<PlanItem[]>(WEEK)).toEqual([item]);
  });

  it('stores the server row on success', async () => {
    const item = makePlanItem();
    const env = seeded([item]);
    const server = { ...item, assignee: 'Yard worker', updatedAt: '2026-10-07T00:00:00.000Z' };
    env.api.on(`PATCH /api/plan/${item.id}`, server);
    const { result } = renderHook(() => useUpdatePlanItem(), { wrapper: env.wrapper });

    await act(() =>
      result.current.mutateAsync({ id: item.id, patch: { assignee: 'Yard worker' } }),
    );
    expect(env.qc.getQueryData<PlanItem[]>(WEEK)).toEqual([server]);
  });
});

describe('useRemovePlanItem', () => {
  it('removes optimistically and restores the item when the server refuses', async () => {
    const item = makePlanItem();
    const env = seeded([item]);
    const pending = deferred<Response>();
    env.api.on(`DELETE /api/plan/${item.id}`, () => pending.promise);
    const { result } = renderHook(() => useRemovePlanItem(), { wrapper: env.wrapper });

    act(() => result.current.mutate(item.id));
    await waitFor(() => expect(env.qc.getQueryData<PlanItem[]>(WEEK)).toEqual([]));

    pending.resolve(jsonResponse({ error: 'That plan item is signed off' }, 409));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(env.qc.getQueryData<PlanItem[]>(WEEK)).toEqual([item]);
  });
});
