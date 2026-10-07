import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiError,
  Completion,
  CompletionsRes,
  CreateCompletionReq,
} from '../../src/shared/api-schemas';
import { addDays, todayCR } from '../../src/shared/dates';
import { type Harness, api, createHarness, resetDb, uuid } from './harness';

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
    const res = await signOff({ id, taskId: 'mow-lawn', note: '  front lawn  ' }, 'José');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id,
      taskId: 'mow-lawn',
      title: null,
      doneOn: today(),
      doneBy: 'Yard worker',
      loggedBy: 'José',
      note: 'front lawn',
      planItemId: null,
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
    const first = await signOff({ id, taskId: 'daily-cat-care' });
    const again = await signOff({ id, taskId: 'daily-cat-care' });
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    const n = await h.db.prepare('SELECT COUNT(*) AS n FROM completions').first<{ n: number }>();
    expect(n?.n).toBe(1);
  });

  it('answers 410 when a repeat id was undone in the meantime', async () => {
    const id = uuid();
    await signOff({ id, taskId: 'daily-cat-care' });
    expect((await api(h, `/api/completions/${id}`, { method: 'DELETE', as: 'JT' })).status).toBe(
      200,
    );
    const again = await signOff({ id, taskId: 'daily-cat-care' });
    expect(again.status).toBe(410);
    expect(again.body.error).toMatch(/undone/);
  });

  it.each<[string, Partial<CreateCompletionReq>, RegExp]>([
    ['future date', { taskId: 'mow-lawn', doneOn: addDays(todayCR(), 1) }, /future/],
    ['unknown task', { taskId: 'not-a-real-task' }, /unknown task/],
    ['both taskId and title', { taskId: 'mow-lawn', title: 'x' }, /exactly one/],
    ['neither taskId nor title', {}, /exactly one/],
    ['blank title', { title: '   ' }, /title/],
    ['bad date', { taskId: 'mow-lawn', doneOn: '2026-02-30' }, /doneOn/],
    ['bad id', { id: 'nope', taskId: 'mow-lawn' }, /id/],
    ['blank doneBy', { taskId: 'mow-lawn', doneBy: ' ' }, /doneBy/],
    ['bad planItemId', { taskId: 'mow-lawn', planItemId: 'x' }, /planItemId/],
    ['unknown planItemId', { taskId: 'mow-lawn', planItemId: uuid() }, /unknown plan item/],
  ])('rejects %s with 400', async (_label, body, message) => {
    const res = await signOff(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });
});

describe('GET /api/completions', () => {
  async function seed() {
    const t = today();
    await signOff({ taskId: 'mow-lawn', doneOn: addDays(t, -10) });
    await signOff({ taskId: 'daily-cat-care', doneOn: addDays(t, -1) });
    await signOff({ taskId: 'daily-cat-care', doneOn: t });
    await signOff({ title: 'Old ad-hoc', doneOn: addDays(t, -401) });
  }

  it('lists non-deleted completions newest first, default last 400 days', async () => {
    await seed();
    const res = await api<CompletionsRes>(h, '/api/completions');
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
    );
    expect(ranged.body.completions).toHaveLength(1);
    const byTask = await api<CompletionsRes>(
      h,
      `/api/completions?task=mow-lawn&from=${addDays(t, -500)}`,
    );
    expect(byTask.body.completions.map((c) => c.taskId)).toEqual(['mow-lawn']);
    const all = await api<CompletionsRes>(h, `/api/completions?from=${addDays(t, -500)}`);
    expect(all.body.completions).toHaveLength(4);
  });

  it('validates the query', async () => {
    expect((await api(h, '/api/completions?from=yesterday')).status).toBe(400);
    expect((await api(h, '/api/completions?from=2026-05-02&to=2026-05-01')).status).toBe(400);
    expect((await api(h, '/api/completions?task=Not%20A%20Slug')).status).toBe(400);
  });
});

describe('GET /api/completions/latest', () => {
  it('returns the latest live completion per catalog task, without a date limit', async () => {
    const t = today();
    await signOff({ taskId: 'rust-inspection', doneOn: addDays(t, -700) });
    await signOff({ taskId: 'mow-lawn', doneOn: addDays(t, -14) });
    const latestMow = await signOff({ taskId: 'mow-lawn', doneOn: addDays(t, -7) });
    const deleted = await signOff({ taskId: 'mow-lawn', doneOn: t });
    await api(h, `/api/completions/${deleted.body.id}`, { method: 'DELETE', as: 'JT' });
    await signOff({ title: 'Ad-hoc job', doneOn: t });

    const res = await api<CompletionsRes>(h, '/api/completions/latest');
    expect(res.status).toBe(200);
    const byTask = Object.fromEntries(res.body.completions.map((c) => [c.taskId, c]));
    expect(Object.keys(byTask).sort()).toEqual(['mow-lawn', 'rust-inspection']);
    expect(byTask['mow-lawn']?.id).toBe(latestMow.body.id);
    expect(byTask['rust-inspection']?.doneOn).toBe(addDays(t, -700));
  });
});

describe('DELETE /api/completions/:id', () => {
  it('soft-deletes (kept for audit, hidden from lists) and is idempotent', async () => {
    const created = await signOff({ taskId: 'mow-lawn' });
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

    const list = await api<CompletionsRes>(h, '/api/completions');
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
