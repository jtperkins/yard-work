import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ApiError, Note, NotesRes } from '../../src/shared/api-schemas';
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

function post(body: Record<string, unknown>, as = 'JT') {
  return api<Note & ApiError>(h, '/api/notes', {
    method: 'POST',
    as,
    body: { id: uuid(), ...body },
  });
}

describe('handoff notes', () => {
  it('are private: signed-out reads and writes get 401 and no data', async () => {
    await post({ body: 'Gate code 1234', pinned: true });
    const res = await api<ApiError>(h, '/api/notes');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('1234');
    expect(
      (await api(h, '/api/notes', { method: 'POST', body: { id: uuid(), body: 'x' } })).status,
    ).toBe(401);
  });

  it('creates a note with the session name as author', async () => {
    const id = uuid();
    const res = await post({ id, body: '  Vet: Dra. Peña  ', pinned: true }, 'José');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id,
      author: 'José',
      body: 'Vet: Dra. Peña',
      pinned: true,
      createdAt: expect.any(String),
    });
  });

  it('is idempotent on the client id', async () => {
    const id = uuid();
    const first = await post({ id, body: 'hello' });
    const again = await post({ id, body: 'hello' });
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
  });

  it('answers 410 when a repeat id was deleted in the meantime', async () => {
    const id = uuid();
    await post({ id, body: 'hello' });
    await api(h, `/api/notes/${id}`, { method: 'DELETE', as: 'JT' });
    expect((await post({ id, body: 'hello' })).status).toBe(410);
  });

  it('lists pinned first, then newest first', async () => {
    const a = await post({ body: 'old pinned', pinned: true });
    await tick();
    const b = await post({ body: 'old note' });
    await tick();
    const c = await post({ body: 'new note' });
    await tick();
    const d = await post({ body: 'new pinned', pinned: true });
    const res = await api<NotesRes>(h, '/api/notes', { as: 'Neighbor' });
    expect(res.status).toBe(200);
    expect(res.body.notes.map((n) => n.id)).toEqual([d.body.id, a.body.id, c.body.id, b.body.id]);
  });

  it('validates the body', async () => {
    expect((await post({ body: '   ' })).status).toBe(400);
    expect((await post({ body: 'x'.repeat(4001) })).status).toBe(400);
    expect((await post({ body: 'x', pinned: 'yes' })).status).toBe(400);
  });

  it('soft-deletes, keeps the audit trail, and is idempotent', async () => {
    const { body: note } = await post({ body: 'Wifi password is on the fridge' });
    const del = await api(h, `/api/notes/${note.id}`, { method: 'DELETE', as: 'Neighbor' });
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });
    expect((await api<NotesRes>(h, '/api/notes', { as: 'JT' })).body.notes).toHaveLength(0);

    const row = await h.db
      .prepare('SELECT deleted_by FROM notes WHERE id = ?')
      .bind(note.id)
      .first<{ deleted_by: string }>();
    expect(row?.deleted_by).toBe('Neighbor');
    expect((await api(h, `/api/notes/${note.id}`, { method: 'DELETE', as: 'JT' })).status).toBe(
      200,
    );
    expect((await api(h, `/api/notes/${uuid()}`, { method: 'DELETE', as: 'JT' })).status).toBe(404);
  });

  it('stores Unicode and emoji intact', async () => {
    const body = 'Gatos: Mía 🐈, Tigre y Ñaño — comida 2× al día';
    await post({ body });
    const res = await api<NotesRes>(h, '/api/notes', { as: 'JT' });
    expect(res.body.notes[0]?.body).toBe(body);
  });
});
