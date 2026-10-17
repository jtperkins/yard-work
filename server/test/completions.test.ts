import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiError,
  Completion,
  CompletionsRes,
  CreateCompletionReq,
} from '../../src/shared/api-schemas';
import { addDays, todayCR } from '../../src/shared/dates';
import { type Harness, api, createHarness, resetDb, seedTask, uuid } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.dispose();
});
beforeEach(async () => {
  await resetDb(h.db);
  for (const id of ['chapia', 'sweep-patio', 'rust-inspection']) await seedTask(h.db, { id });
});

const today = () => todayCR();

function signOff(body: Partial<CreateCompletionReq>, as = 'JT') {
  return api<Completion & ApiError>(h, '/api/completions', {
    method: 'POST',
    as,
    body: { id: uuid(), doneOn: today(), doneBy: 'Yard worker', ...body },
  });
}

describe('POST /api/completions', () => {
  it('creates a catalog sign-off, logged_by from the session', async () => {
    const id = uuid();
    const res = await signOff({ id, taskId: 'chapia', note: '  front lawn  ' }, 'José');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id,
      taskId: 'chapia',
      title: null,
      doneOn: today(),
      doneBy: 'Yard worker',
      loggedBy: 'José',
      note: 'front lawn',
      planItemId: null,
      partial: false,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
  });

  it('creates an ad-hoc sign-off with a title; blank note becomes null', async () => {
    const res = await signOff({
      title: 'Fixed gate latch',
      note: '   ',
      doneOn: addDays(today(), -3),
    });
    expect(res.status).toBe(201);
    expect(res.body.taskId).toBeNull();
    expect(res.body.title).toBe('Fixed gate latch');
    expect(res.body.note).toBeNull();
  });

  it('is idempotent on the client id', async () => {
    const id = uuid();
    const first = await signOff({ id, taskId: 'sweep-patio' });
    const again = await signOff({ id, taskId: 'sweep-patio' });
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    const n = await h.db.prepare('SELECT COUNT(*) AS n FROM completions').first<{ n: number }>();
    expect(n?.n).toBe(1);
  });

  it('answers 410 when a repeat id was undone in the meantime', async () => {
    const id = uuid();
    await signOff({ id, taskId: 'sweep-patio' });
    expect((await api(h, `/api/completions/${id}`, { method: 'DELETE', as: 'JT' })).status).toBe(
      200,
    );
    const again = await signOff({ id, taskId: 'sweep-patio' });
    expect(again.status).toBe(410);
    expect(again.body.error).toMatch(/undone/);
  });

  it.each<[string, Partial<CreateCompletionReq>, RegExp]>([
    ['future date', { taskId: 'chapia', doneOn: addDays(todayCR(), 1) }, /future/],
    ['unknown task', { taskId: 'not-a-real-task' }, /unknown task/],
    ['both taskId and title', { taskId: 'chapia', title: 'x' }, /exactly one/],
    ['neither taskId nor title', {}, /exactly one/],
    ['blank title', { title: '   ' }, /title/],
    ['bad date', { taskId: 'chapia', doneOn: '2026-02-30' }, /doneOn/],
    ['bad id', { id: 'nope', taskId: 'chapia' }, /id/],
    ['blank doneBy', { taskId: 'chapia', doneBy: ' ' }, /doneBy/],
    ['partial without a note', { taskId: 'chapia', partial: true }, /note/],
  ])('rejects %s with 400', async (_label, body, message) => {
    const res = await signOff(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });
});

describe('POST /api/completions with tasks from the database', () => {
  it('accepts a task created through the API and an archived one', async () => {
    const created = await api<{ task: { id: string } }>(h, '/api/tasks', {
      method: 'POST',
      as: 'JT',
      body: { title: 'Fix gate latch', kind: 'once' },
    });
    expect(created.status).toBe(201);
    expect((await signOff({ taskId: created.body.task.id })).status).toBe(201);
    await seedTask(h.db, { id: 'old-job', archived: true });
    expect((await signOff({ taskId: 'old-job' })).status).toBe(201);
  });

  it('stores a partial sign-off and returns it flagged', async () => {
    const res = await signOff({ taskId: 'chapia', partial: true, note: 'Back next week' });
    expect(res.status).toBe(201);
    const list = await api<CompletionsRes>(h, '/api/completions', { as: 'JT' });
    expect(list.body.completions[0]?.partial).toBe(true);
  });
});

describe('GET /api/completions', () => {
  async function seed() {
    const t = today();
    await signOff({ taskId: 'chapia', doneOn: addDays(t, -10) });
    await signOff({ taskId: 'sweep-patio', doneOn: addDays(t, -1) });
    await signOff({ taskId: 'sweep-patio', doneOn: t });
    await signOff({ title: 'Old ad-hoc', doneOn: addDays(t, -401) });
  }

  it('lists non-deleted completions newest first, default last 400 days', async () => {
    await seed();
    const res = await api<CompletionsRes>(h, '/api/completions', { as: 'JT' });
    expect(res.status).toBe(200);
    expect(res.body.completions.map((c) => c.doneOn)).toEqual([
      today(),
      addDays(today(), -1),
      addDays(today(), -10),
    ]);
  });

  it('filters by range and task', async () => {
    await seed();
    const t = today();
    const ranged = await api<CompletionsRes>(
      h,
      `/api/completions?from=${addDays(t, -5)}&to=${addDays(t, -1)}`,
      { as: 'JT' },
    );
    expect(ranged.body.completions).toHaveLength(1);
    const byTask = await api<CompletionsRes>(
      h,
      `/api/completions?task=chapia&from=${addDays(t, -500)}`,
      { as: 'JT' },
    );
    expect(byTask.body.completions.map((c) => c.taskId)).toEqual(['chapia']);
    const all = await api<CompletionsRes>(h, `/api/completions?from=${addDays(t, -500)}`, {
      as: 'JT',
    });
    expect(all.body.completions).toHaveLength(4);
  });

  it('validates the query', async () => {
    expect((await api(h, '/api/completions?from=yesterday', { as: 'JT' })).status).toBe(400);
    expect(
      (await api(h, '/api/completions?from=2026-05-02&to=2026-05-01', { as: 'JT' })).status,
    ).toBe(400);
    expect((await api(h, '/api/completions?task=Not%20A%20Slug', { as: 'JT' })).status).toBe(400);
  });
});

describe('GET /api/completions/latest', () => {
  it('returns the latest live completion per catalog task, without a date limit', async () => {
    const t = today();
    await signOff({ taskId: 'rust-inspection', doneOn: addDays(t, -700) });
    await signOff({ taskId: 'chapia', doneOn: addDays(t, -14) });
    const latestMow = await signOff({ taskId: 'chapia', doneOn: addDays(t, -7) });
    const deleted = await signOff({ taskId: 'chapia', doneOn: t });
    await api(h, `/api/completions/${deleted.body.id}`, { method: 'DELETE', as: 'JT' });
    await signOff({ title: 'Ad-hoc job', doneOn: t });

    const res = await api<CompletionsRes>(h, '/api/completions/latest', { as: 'JT' });
    expect(res.status).toBe(200);
    const byTask = Object.fromEntries(res.body.completions.map((c) => [c.taskId, c]));
    expect(Object.keys(byTask).sort()).toEqual(['chapia', 'rust-inspection']);
    expect(byTask['chapia']?.id).toBe(latestMow.body.id);
    expect(byTask['rust-inspection']?.doneOn).toBe(addDays(t, -700));
  });
});

describe('GET /api/completions/latest with partials', () => {
  it('keeps the newest full sign-off next to the newest partial one', async () => {
    const full = await signOff({ taskId: 'chapia', doneOn: '2026-09-20' });
    const firstPartial = await signOff({
      taskId: 'chapia',
      doneOn: '2026-10-01',
      partial: true,
      note: 'half',
    });
    const rows = async () =>
      (await api<CompletionsRes>(h, '/api/completions/latest', { as: 'JT' })).body.completions;
    let latest = await rows();
    expect(latest.map((c) => [c.partial, c.doneOn]).sort()).toEqual([
      [false, '2026-09-20'],
      [true, '2026-10-01'],
    ]);
    expect(latest.find((c) => !c.partial)?.id).toBe(full.body.id);
    expect(latest.find((c) => c.partial)?.id).toBe(firstPartial.body.id);

    await signOff({ taskId: 'chapia', doneOn: '2026-10-05', partial: true, note: 'still half' });
    latest = await rows();
    expect(latest.map((c) => [c.partial, c.doneOn]).sort()).toEqual([
      [false, '2026-09-20'],
      [true, '2026-10-05'],
    ]);
  });
});

describe('DELETE /api/completions/:id', () => {
  it('soft-deletes (kept for audit, hidden from lists) and is idempotent', async () => {
    const created = await signOff({ taskId: 'chapia' });
    const id = created.body.id;
    const del = await api(h, `/api/completions/${id}`, { method: 'DELETE', as: 'Neighbor' });
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });

    const row = await h.db
      .prepare('SELECT deleted_at, deleted_by FROM completions WHERE id = ?')
      .bind(id)
      .first<{ deleted_at: string | null; deleted_by: string | null }>();
    expect(row?.deleted_at).toBeTruthy();
    expect(row?.deleted_by).toBe('Neighbor');

    const list = await api<CompletionsRes>(h, '/api/completions', { as: 'JT' });
    expect(list.body.completions).toHaveLength(0);

    const again = await api(h, `/api/completions/${id}`, { method: 'DELETE', as: 'JT' });
    expect(again.status).toBe(200);
    const unchanged = await h.db
      .prepare('SELECT deleted_by FROM completions WHERE id = ?')
      .bind(id)
      .first<{ deleted_by: string }>();
    expect(unchanged?.deleted_by).toBe('Neighbor');
  });

  it('404s for unknown or malformed ids', async () => {
    expect(
      (await api(h, `/api/completions/${uuid()}`, { method: 'DELETE', as: 'JT' })).status,
    ).toBe(404);
    expect(
      (await api(h, '/api/completions/not-a-uuid', { method: 'DELETE', as: 'JT' })).status,
    ).toBe(404);
  });
});
