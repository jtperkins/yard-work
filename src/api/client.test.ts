import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiRequestError, isConflict, isNetworkError, isUnauthorized } from './errors';
import { newId } from './ids';
import { makeTask } from '../domain/test-fixtures';
import { createFakeApi, jsonResponse, makeCompletion, makeIncidentFile } from './test-utils';

const ID = '11111111-1111-4111-8111-111111111111';

describe('createApiClient', () => {
  it('GETs /api/me same-origin with JSON accept header and validates the DTO', async () => {
    const api = createFakeApi();
    api.on('GET /api/me', { name: 'José' });
    const client = createApiClient({ fetch: api.fetch });

    await expect(client.me()).resolves.toEqual({ name: 'José' });
    const [call] = api.calls;
    expect(call?.init?.credentials).toBe('same-origin');
    expect(call?.init?.headers).toMatchObject({ accept: 'application/json' });
    expect(call?.init?.body).toBeUndefined();
  });

  it('builds completions query strings, skipping empty fields, and unwraps the envelope', async () => {
    const api = createFakeApi();
    const rows = [makeCompletion()];
    api.on('GET /api/completions', { completions: rows });
    const client = createApiClient({ fetch: api.fetch });

    await expect(client.listCompletions({ from: '2026-01-01', task: '' })).resolves.toEqual(rows);
    const [call] = api.calls;
    expect(call?.search.get('from')).toBe('2026-01-01');
    expect(call?.search.has('task')).toBe(false);
    expect(call?.search.has('to')).toBe(false);
  });

  it('unwraps latest completions, tasks and notes', async () => {
    const api = createFakeApi();
    const task = makeTask({ id: 'chapia' });
    api.on('GET /api/completions/latest', { completions: [] });
    api.on('GET /api/tasks', { tasks: [task] });
    api.on('GET /api/tasks/chapia', { task });
    api.on('GET /api/notes', { notes: [] });
    const client = createApiClient({ fetch: api.fetch });

    await expect(client.latestCompletions()).resolves.toEqual([]);
    await expect(client.listTasks({ archived: true })).resolves.toEqual([task]);
    expect(api.callsTo('GET /api/tasks')[0]?.search.get('archived')).toBe('1');
    await expect(client.listTasks()).resolves.toEqual([task]);
    expect(api.callsTo('GET /api/tasks')[1]?.search.has('archived')).toBe(false);
    await expect(client.getTask('chapia')).resolves.toEqual(task);
    await expect(client.listNotes()).resolves.toEqual([]);
  });

  it('uploads a file as the raw body with its type and encoded name', async () => {
    const api = createFakeApi();
    const stored = makeIncidentFile({ incidentId: ID });
    api.on(`POST /api/incidents/${ID}/files`, jsonResponse(stored, 201));
    const client = createApiClient({ fetch: api.fetch });
    const file = new File([new Uint8Array(4)], 'mi foto.heic', { type: '' });

    await expect(client.uploadIncidentFile(ID, file, 'image/heic')).resolves.toEqual(stored);
    const call = api.callsTo(`POST /api/incidents/${ID}/files`)[0];
    expect(call?.init?.headers).toMatchObject({
      'content-type': 'image/heic',
      'x-file-name': 'mi%20foto.heic',
    });
    expect(call?.init?.body).toBe(file);
  });

  it('sends JSON bodies for writes and encodes ids into paths', async () => {
    const api = createFakeApi();
    const completion = makeCompletion({ id: ID });
    api.on('POST /api/completions', (call) =>
      jsonResponse({ ...completion, ...(call.body as object) }, 201),
    );
    api.on('PATCH /api/tasks/chapia', { task: makeTask({ id: 'chapia', priority: 'low' }) });
    api.on(`DELETE /api/completions/${ID}`, { ok: true });
    const client = createApiClient({ fetch: api.fetch });

    await client.createCompletion({
      id: ID,
      taskId: 'chapia',
      doneOn: '2026-10-01',
      doneBy: 'JT',
    });
    const post = api.callsTo('POST /api/completions')[0];
    expect(post?.init?.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(post?.body).toEqual({ id: ID, taskId: 'chapia', doneOn: '2026-10-01', doneBy: 'JT' });

    await expect(client.updateTask('chapia', { priority: 'low' })).resolves.toMatchObject({
      priority: 'low',
    });
    await expect(client.deleteCompletion(ID)).resolves.toEqual({ ok: true });

    await client.deleteNote('a/b').catch(() => undefined);
    expect(api.calls.at(-1)?.path).toBe('/api/notes/a%2Fb');
  });

  it('turns `{error}` bodies into ApiRequestError with status and message', async () => {
    const api = createFakeApi();
    api.on('POST /api/tasks', jsonResponse({ error: 'That task is already planned' }, 409));
    const client = createApiClient({ fetch: api.fetch });

    const err = await client.createTask({ title: 'Gate', kind: 'once' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({
      status: 409,
      kind: 'http',
      message: 'That task is already planned',
    });
    expect(isConflict(err)).toBe(true);
  });

  it('falls back to the status text when the error body is not JSON', async () => {
    const fetch = vi.fn(
      async () => new Response('<html>oops</html>', { status: 502, statusText: 'Bad Gateway' }),
    );
    const client = createApiClient({ fetch });
    await expect(client.me()).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('calls onUnauthorized on a 401, except for a failed login', async () => {
    const api = createFakeApi();
    api.on('GET /api/notes', jsonResponse({ error: 'Sign in required' }, 401));
    api.on('POST /api/login', jsonResponse({ error: 'Wrong house code' }, 401));
    const onUnauthorized = vi.fn();
    const client = createApiClient({ fetch: api.fetch, onUnauthorized });

    const notesErr = await client.listNotes().catch((e: unknown) => e);
    expect(isUnauthorized(notesErr)).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    await expect(client.login({ name: 'JT', code: 'nope' })).rejects.toMatchObject({
      status: 401,
      message: 'Wrong house code',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('wraps fetch failures as network errors (status 0)', async () => {
    const client = createApiClient({
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    const err = await client.me().catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 0, kind: 'network' });
    expect(isNetworkError(err)).toBe(true);
  });

  it('lets aborts propagate untouched', async () => {
    const abort = new DOMException('aborted', 'AbortError');
    const client = createApiClient({ fetch: () => Promise.reject(abort) });
    await expect(client.me()).rejects.toBe(abort);
  });

  it('rejects 2xx bodies that do not match the DTO schema', async () => {
    const api = createFakeApi();
    api.on('GET /api/me', { user: 'JT' });
    const client = createApiClient({ fetch: api.fetch });
    await expect(client.me()).rejects.toMatchObject({ kind: 'invalid-response', status: 200 });
  });

  it('uses the global fetch at call time by default', async () => {
    const spy = vi.fn(async () => jsonResponse({ name: null }));
    vi.stubGlobal('fetch', spy);
    try {
      const client = createApiClient({ baseUrl: 'https://example.test' });
      await expect(client.logout()).resolves.toEqual({ name: null });
      expect(spy).toHaveBeenCalledWith('https://example.test/api/logout', expect.anything());
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('newId', () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('returns a v4 UUID', () => {
    expect(newId()).toMatch(UUID_V4);
    expect(newId()).not.toBe(newId());
  });

  it('falls back to getRandomValues outside secure contexts', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });
    try {
      expect(newId()).toMatch(UUID_V4);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
