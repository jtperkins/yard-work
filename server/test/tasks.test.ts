import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ApiError, TaskRes, TasksRes } from '../../src/shared/api-schemas';
import { slugify } from '../lib';
import { type Harness, api, createHarness, resetDb } from './harness';

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

function create(body: object, as: string | undefined = 'JT') {
  return api<TaskRes & ApiError>(h, '/api/tasks', { method: 'POST', as, body });
}

describe('tasks API', () => {
  it('lists publicly, but creating needs a session', async () => {
    const list = await api<TasksRes>(h, '/api/tasks');
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ tasks: [] });
    const post = await api<ApiError>(h, '/api/tasks', {
      method: 'POST',
      body: { title: 'x', kind: 'once' },
    });
    expect(post.status).toBe(401);
  });

  it('creates a task with a slug id, and numbers a repeated title', async () => {
    const first = await create({ title: 'Fix gate latch', kind: 'once' });
    expect(first.status).toBe(201);
    expect(first.body.task.id).toBe('fix-gate-latch');
    expect(first.body.task.createdBy).toBe('JT');
    const second = await create({ title: 'Fix gate latch', kind: 'once' });
    expect(second.body.task.id).toBe('fix-gate-latch-2');
  });

  it('keeps router words, accents and symbols safe', async () => {
    expect((await create({ title: 'New', kind: 'once' })).body.task.id).toBe('new-task');
    expect((await create({ title: 'Edit', kind: 'once' })).body.task.id).toBe('edit-task');
    expect((await create({ title: 'Revisión del portón', kind: 'once' })).body.task.id).toBe(
      'revision-del-porton',
    );
    expect((await create({ title: '¿¡!?', kind: 'once' })).body.task.id).toMatch(
      /^task-[0-9a-f]{8}$/,
    );
    expect(slugify('x'.repeat(80))).toHaveLength(50);
  });

  it('serves a task by slug and 404s on a non-slug', async () => {
    await create({ title: 'New', kind: 'once' });
    const got = await api<TaskRes>(h, '/api/tasks/new-task');
    expect(got.status).toBe(200);
    expect(got.body.task.title).toBe('New');
    expect((await api(h, '/api/tasks/NOT_A_SLUG')).status).toBe(404);
    expect((await api(h, '/api/tasks/nope')).status).toBe(404);
  });

  it('stores steps one per line and splits them back', async () => {
    const res = await create({
      title: 'Paint',
      kind: 'recurring',
      intervalCount: 2,
      intervalUnit: 'week',
      steps: ['one', '', 'two'],
      stepsEs: ['uno'],
      safety: 'Gloves',
      priority: 'high',
    });
    expect(res.body.task).toMatchObject({
      steps: ['one', 'two'],
      stepsEs: ['uno'],
      safety: 'Gloves',
      priority: 'high',
      kind: 'recurring',
      intervalCount: 2,
      intervalUnit: 'week',
      dueOn: null,
    });
  });

  it('rejects a recurring task without an interval', async () => {
    const res = await create({ title: 'Bad', kind: 'recurring' });
    expect(res.status).toBe(400);
  });

  it('edits a task and can switch its kind', async () => {
    await create({ title: 'Gate', kind: 'once', dueOn: '2026-10-30' });
    const patched = await api<TaskRes & ApiError>(h, '/api/tasks/gate', {
      method: 'PATCH',
      as: 'JT',
      body: { kind: 'recurring', intervalCount: 3, intervalUnit: 'month', title: 'Gate check' },
    });
    expect(patched.status).toBe(200);
    expect(patched.body.task).toMatchObject({
      id: 'gate',
      title: 'Gate check',
      kind: 'recurring',
      intervalCount: 3,
      intervalUnit: 'month',
      dueOn: null,
    });
    const bad = await api<ApiError>(h, '/api/tasks/gate', {
      method: 'PATCH',
      as: 'JT',
      body: { kind: 'once', intervalCount: 3 },
    });
    expect(bad.status).toBe(400);
    const missing = await api<ApiError>(h, '/api/tasks/gone', {
      method: 'PATCH',
      as: 'JT',
      body: { title: 'x' },
    });
    expect(missing.status).toBe(404);
  });

  it('archives and unarchives', async () => {
    await create({ title: 'Gate', kind: 'once' });
    const archive = await api<TaskRes>(h, '/api/tasks/gate', {
      method: 'PATCH',
      as: 'JT',
      body: { archived: true },
    });
    expect(archive.body.task.archivedAt).toBeTruthy();
    expect((await api<TasksRes>(h, '/api/tasks')).body.tasks).toHaveLength(0);
    expect((await api<TasksRes>(h, '/api/tasks?archived=1')).body.tasks).toHaveLength(1);
    expect((await api<TaskRes>(h, '/api/tasks/gate')).body.task.archivedAt).toBeTruthy();
    const back = await api<TaskRes>(h, '/api/tasks/gate', {
      method: 'PATCH',
      as: 'JT',
      body: { archived: false },
    });
    expect(back.body.task.archivedAt).toBeNull();
    expect((await api<TasksRes>(h, '/api/tasks')).body.tasks).toHaveLength(1);
  });
});
