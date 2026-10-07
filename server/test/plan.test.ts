import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiError,
  Completion,
  CreatePlanItemReq,
  PlanItem,
  PlanRes,
} from '../../src/shared/api-schemas';
import { addDays, todayCR, weekStart } from '../../src/shared/dates';
import { type Harness, api, createHarness, resetDb, tick, uuid } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.dispose();
});
beforeEach(async () => {
  await resetDb(h.db);
});

const thisWeek = () => weekStart(todayCR());

function addItem(body: Partial<CreatePlanItemReq>, as = 'JT') {
  return api<PlanItem & ApiError>(h, '/api/plan', {
    method: 'POST',
    as,
    body: { id: uuid(), weekStart: thisWeek(), ...body },
  });
}

function getWeek(week = thisWeek()) {
  return api<PlanRes>(h, `/api/plan?week=${week}`);
}

function signOff(body: Record<string, unknown>) {
  return api<Completion & ApiError>(h, '/api/completions', {
    method: 'POST',
    as: 'JT',
    body: { id: uuid(), doneOn: todayCR(), doneBy: 'Yard worker', ...body },
  });
}

function undo(id: string) {
  return api(h, `/api/completions/${id}`, { method: 'DELETE', as: 'JT' });
}

async function itemById(id: string): Promise<PlanItem | undefined> {
  const res = await getWeek();
  return res.body.items.find((i) => i.id === id);
}

describe('GET /api/plan', () => {
  it('requires a Monday', async () => {
    const monday = thisWeek();
    expect((await api(h, `/api/plan?week=${addDays(monday, 1)}`)).status).toBe(400);
    expect((await api(h, '/api/plan')).status).toBe(400);
    expect((await api(h, '/api/plan?week=soon')).status).toBe(400);
    const ok = await getWeek(monday);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ items: [] });
  });

  it('only returns items for that week, in creation order', async () => {
    await addItem({ taskId: 'mow-lawn' });
    await tick();
    await addItem({ title: 'Clean carport gutters' });
    await addItem({ taskId: 'mow-lawn', weekStart: addDays(thisWeek(), 7) });
    const res = await getWeek();
    expect(res.body.items.map((i) => i.taskId ?? i.title)).toEqual([
      'mow-lawn',
      'Clean carport gutters',
    ]);
  });
});

describe('POST /api/plan', () => {
  it('creates an item', async () => {
    const id = uuid();
    const res = await addItem(
      { id, taskId: 'mow-lawn', assignee: 'Yard worker', note: ' ' },
      'Ñoño',
    );
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id,
      weekStart: thisWeek(),
      taskId: 'mow-lawn',
      title: null,
      assignee: 'Yard worker',
      note: null,
      status: 'planned',
      createdBy: 'Ñoño',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      completion: null,
    });
  });

  it('is idempotent on the client id', async () => {
    const id = uuid();
    const first = await addItem({ id, taskId: 'mow-lawn' });
    const again = await addItem({ id, taskId: 'mow-lawn' });
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
  });

  it('rejects a duplicate catalog task in the same week with 409, but allows ad-hoc repeats', async () => {
    expect((await addItem({ taskId: 'mow-lawn' })).status).toBe(201);
    const dup = await addItem({ taskId: 'mow-lawn' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/already planned/);
    expect((await addItem({ title: 'Sweep patio' })).status).toBe(201);
    expect((await addItem({ title: 'Sweep patio' })).status).toBe(201);
  });

  it.each<[string, Partial<CreatePlanItemReq>]>([
    ['non-Monday week', { taskId: 'mow-lawn', weekStart: addDays(weekStart(todayCR()), 2) }],
    ['unknown task', { taskId: 'nope-nope' }],
    ['both task and title', { taskId: 'mow-lawn', title: 'x' }],
    ['neither task nor title', {}],
    ['assignee too long', { taskId: 'mow-lawn', assignee: 'x'.repeat(41) }],
  ])('rejects %s with 400', async (_label, body) => {
    expect((await addItem(body)).status).toBe(400);
  });
});

describe('PATCH /api/plan/:id', () => {
  it('updates assignee, note and status; null or blank clears', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn', assignee: 'JT', note: 'front' });
    const res = await api<PlanItem>(h, `/api/plan/${item.id}`, {
      method: 'PATCH',
      as: 'JT',
      body: { assignee: 'Yard worker', note: null, status: 'skipped' },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ assignee: 'Yard worker', note: null, status: 'skipped' });

    const cleared = await api<PlanItem>(h, `/api/plan/${item.id}`, {
      method: 'PATCH',
      as: 'JT',
      body: { assignee: '  ', status: 'planned' },
    });
    expect(cleared.body).toMatchObject({ assignee: null, status: 'planned' });
  });

  it('rejects empty patches and status "done"', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    for (const body of [{}, { status: 'done' }]) {
      const res = await api(h, `/api/plan/${item.id}`, { method: 'PATCH', as: 'JT', body });
      expect(res.status).toBe(400);
    }
  });

  it('404s for unknown ids', async () => {
    const res = await api(h, `/api/plan/${uuid()}`, {
      method: 'PATCH',
      as: 'JT',
      body: { status: 'skipped' },
    });
    expect(res.status).toBe(404);
  });

  it('409s on a done item', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    await signOff({ taskId: 'mow-lawn', planItemId: item.id });
    const res = await api(h, `/api/plan/${item.id}`, {
      method: 'PATCH',
      as: 'JT',
      body: { status: 'skipped' },
    });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/plan/:id', () => {
  it('hard-deletes a planned or skipped item', async () => {
    const { body: item } = await addItem({ title: 'Wash windows' });
    const res = await api(h, `/api/plan/${item.id}`, { method: 'DELETE', as: 'JT' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect((await getWeek()).body.items).toHaveLength(0);
    expect((await api(h, `/api/plan/${item.id}`, { method: 'DELETE', as: 'JT' })).status).toBe(404);
  });

  it('409s on a done item', async () => {
    const { body: item } = await addItem({ title: 'Wash windows' });
    await signOff({ title: 'Wash windows', planItemId: item.id });
    expect((await api(h, `/api/plan/${item.id}`, { method: 'DELETE', as: 'JT' })).status).toBe(409);
  });
});

describe('plan ↔ completion linking', () => {
  it('explicit planItemId marks the item done and exposes the completion summary', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    const done = await signOff({ taskId: 'mow-lawn', planItemId: item.id, doneBy: 'Don Carlos' });
    expect(done.status).toBe(201);
    expect(done.body.planItemId).toBe(item.id);

    const linked = await itemById(item.id);
    expect(linked?.status).toBe('done');
    expect(linked?.completion).toEqual({
      id: done.body.id,
      doneOn: todayCR(),
      doneBy: 'Don Carlos',
    });
  });

  it('signing off a skipped item still marks it done', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    await api(h, `/api/plan/${item.id}`, {
      method: 'PATCH',
      as: 'JT',
      body: { status: 'skipped' },
    });
    await signOff({ taskId: 'mow-lawn', planItemId: item.id });
    expect((await itemById(item.id))?.status).toBe('done');
  });

  it('ad-hoc plan items link to ad-hoc sign-offs', async () => {
    const { body: item } = await addItem({ title: 'Clear fallen branch' });
    const done = await signOff({ title: 'Clear fallen branch', planItemId: item.id });
    expect(done.status).toBe(201);
    expect((await itemById(item.id))?.status).toBe('done');
  });

  it('rejects a planItemId for a different task, and a second sign-off of a done item', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    const wrong = await signOff({ taskId: 'rust-inspection', planItemId: item.id });
    expect(wrong.status).toBe(400);
    const adhoc = await signOff({ title: 'Mowed', planItemId: item.id });
    expect(adhoc.status).toBe(400);
    expect((await signOff({ taskId: 'mow-lawn', planItemId: item.id })).status).toBe(201);
    expect((await signOff({ taskId: 'mow-lawn', planItemId: item.id })).status).toBe(409);
  });

  it('auto-links the planned item for the task in the week containing doneOn', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    const done = await signOff({ taskId: 'mow-lawn' });
    expect(done.body.planItemId).toBe(item.id);
    expect((await itemById(item.id))?.status).toBe('done');
  });

  it('does not auto-link skipped items, other tasks, or other weeks', async () => {
    const { body: skipped } = await addItem({ taskId: 'mow-lawn' });
    await api(h, `/api/plan/${skipped.id}`, {
      method: 'PATCH',
      as: 'JT',
      body: { status: 'skipped' },
    });
    const { body: other } = await addItem({ taskId: 'rust-inspection' });
    const lastWeek = addDays(thisWeek(), -7);
    const { body: old } = await addItem({ taskId: 'daily-cat-care', weekStart: lastWeek });

    expect((await signOff({ taskId: 'mow-lawn' })).body.planItemId).toBeNull();
    expect((await signOff({ taskId: 'daily-cat-care' })).body.planItemId).toBeNull();
    expect((await itemById(skipped.id))?.status).toBe('skipped');
    expect((await itemById(other.id))?.status).toBe('planned');
    const lastWeekItems = (await getWeek(lastWeek)).body.items;
    expect(lastWeekItems.find((i) => i.id === old.id)?.status).toBe('planned');

    // Backdated into last week → links last week's item.
    const backdated = await signOff({ taskId: 'daily-cat-care', doneOn: addDays(lastWeek, 2) });
    expect(backdated.body.planItemId).toBe(old.id);
  });

  it('undo (soft delete) reverts the linked plan item to planned', async () => {
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    const done = await signOff({ taskId: 'mow-lawn' });
    expect((await itemById(item.id))?.status).toBe('done');

    expect((await undo(done.body.id)).status).toBe(200);
    const reverted = await itemById(item.id);
    expect(reverted?.status).toBe('planned');
    expect(reverted?.completion).toBeNull();

    // …and it can be signed off again (auto-link picks it up).
    const redo = await signOff({ taskId: 'mow-lawn' });
    expect(redo.body.planItemId).toBe(item.id);
    expect((await itemById(item.id))?.completion?.id).toBe(redo.body.id);
  });

  it('undo of an unlinked completion leaves plan items alone', async () => {
    const lone = await signOff({ taskId: 'mow-lawn' });
    const { body: item } = await addItem({ taskId: 'mow-lawn' });
    await undo(lone.body.id);
    expect((await itemById(item.id))?.status).toBe('planned');
  });
});
