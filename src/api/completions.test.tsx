import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from '../domain/test-fixtures';
import type { Completion, CreateCompletionReq, Me } from '../shared/api-schemas';
import { useCompletions, useSignOff, useTaskStatuses, useUndoSignOff } from './completions';
import { isUnauthorized } from './errors';
import { queryKeys } from './keys';
import { deferred, jsonResponse, makeCompletion, setupApi } from './test-utils';

const OCT = queryKeys.completions.list({ from: '2026-10-01', to: '2026-10-31' });
const SEPT = queryKeys.completions.list({ from: '2026-09-01', to: '2026-09-30' });
const LATEST = queryKeys.completions.latest();

/** A fake API + caches seeded as if Board and Log (two months) had loaded. */
function seeded() {
  const env = setupApi();
  const prev = makeCompletion({ doneOn: '2026-09-20', doneBy: 'Neighbor' });
  const trash = makeCompletion({ taskId: 'other-task', doneOn: '2026-10-02' });
  env.qc.setQueryData<Me>(queryKeys.me(), { name: 'JT' });
  env.qc.setQueryData<Completion[]>(LATEST, [trash, prev]);
  env.qc.setQueryData<Completion[]>(OCT, [trash]);
  env.qc.setQueryData<Completion[]>(SEPT, [prev]);
  return { ...env, prev, trash };
}

const getData = <T,>(env: ReturnType<typeof setupApi>, key: readonly unknown[]) =>
  env.qc.getQueryData<T>(key);

describe('useSignOff', () => {
  it('applies the sign-off optimistically everywhere before the server answers', async () => {
    const env = seeded();
    const pending = deferred<Response>();
    env.api.on('POST /api/completions', () => pending.promise);
    const { result } = renderHook(() => useSignOff(), { wrapper: env.wrapper });

    let id = '';
    act(() => {
      id = result.current.mutate({
        taskId: 'chapia',
        doneOn: '2026-10-06',
        doneBy: '  Yard worker ',
        note: '   ',
      });
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    await waitFor(() => expect(env.api.callsTo('POST /api/completions')).toHaveLength(1));
    const body = env.api.callsTo('POST /api/completions')[0]?.body as CreateCompletionReq;
    expect(body.id).toBe(id);

    const latest = getData<Completion[]>(env, LATEST);
    expect(latest?.map((c) => c.id)).toEqual([id, env.trash.id]);
    expect(latest?.[0]).toMatchObject({
      doneBy: 'Yard worker',
      note: null,
      loggedBy: 'JT',
      partial: false,
    });
    expect(getData<Completion[]>(env, OCT)?.map((c) => c.id)).toEqual([id, env.trash.id]);
    expect(getData<Completion[]>(env, SEPT)).toEqual([env.prev]);

    pending.resolve(jsonResponse(makeCompletion({ id, doneOn: '2026-10-06' }), 201));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(id);
  });

  it('keeps a caller-supplied id and leaves the latest list alone for ad-hoc work', async () => {
    const env = seeded();
    env.api.on('POST /api/completions', (call) =>
      jsonResponse(makeCompletion(call.body as object), 201),
    );
    const { result } = renderHook(() => useSignOff(), { wrapper: env.wrapper });

    const id = '22222222-2222-4222-8222-222222222222';
    await act(() =>
      result.current.mutateAsync({
        id,
        title: 'Fix gate latch',
        doneOn: '2026-10-06',
        doneBy: 'JT',
      }),
    );
    expect(getData<Completion[]>(env, LATEST)?.map((c) => c.id)).toEqual([
      env.trash.id,
      env.prev.id,
    ]);
  });

  it('rolls every cache back when the server rejects the sign-off', async () => {
    const env = seeded();
    const before = {
      latest: getData(env, LATEST),
      oct: getData(env, OCT),
    };
    const pending = deferred<Response>();
    env.api.on('POST /api/completions', () => pending.promise);
    const { result } = renderHook(() => useSignOff(), { wrapper: env.wrapper });

    act(() => {
      result.current.mutate({ taskId: 'chapia', doneOn: '2026-10-06', doneBy: 'JT' });
    });
    await waitFor(() => expect(getData<Completion[]>(env, LATEST)).not.toEqual(before.latest));

    pending.resolve(jsonResponse({ error: 'doneOn: cannot be in the future' }, 400));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('doneOn: cannot be in the future');
    expect(getData(env, LATEST)).toEqual(before.latest);
    expect(getData(env, OCT)).toEqual(before.oct);
    expect(getData<Me>(env, queryKeys.me())).toEqual({ name: 'JT' });
  });

  it('retries a lost request with the same id, so the server dedupes it', async () => {
    const env = seeded();
    let attempts = 0;
    env.api.on('POST /api/completions', (call) => {
      attempts += 1;
      // First attempt: the row commits but the response never arrives.
      if (attempts === 1) throw new TypeError('Failed to fetch');
      return jsonResponse(makeCompletion(call.body as object), 200);
    });
    const { result } = renderHook(() => useSignOff(), { wrapper: env.wrapper });

    let id = '';
    act(() => {
      id = result.current.mutate({ taskId: 'chapia', doneOn: '2026-10-06', doneBy: 'JT' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });
    const ids = env.api
      .callsTo('POST /api/completions')
      .map((c) => (c.body as CreateCompletionReq).id);
    expect(ids).toEqual([id, id]);
    // Never rolled back: the optimistic row is still there.
    expect(getData<Completion[]>(env, LATEST)?.[0]?.id).toBe(id);
  });

  it('does not retry HTTP errors', async () => {
    const env = seeded();
    env.api.on('POST /api/completions', jsonResponse({ error: 'boom' }, 500));
    const { result } = renderHook(() => useSignOff(), { wrapper: env.wrapper });
    act(() => {
      result.current.mutate({ taskId: 'chapia', doneOn: '2026-10-06', doneBy: 'JT' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(env.api.callsTo('POST /api/completions')).toHaveLength(1);
  });

  it('marks the session signed out on a 401', async () => {
    const env = seeded();
    env.api.on('POST /api/completions', jsonResponse({ error: 'Sign in required' }, 401));
    const { result } = renderHook(() => useSignOff(), { wrapper: env.wrapper });

    act(() => {
      result.current.mutate({ taskId: 'chapia', doneOn: '2026-10-06', doneBy: 'JT' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isUnauthorized(result.current.error)).toBe(true);
    expect(getData<Me>(env, queryKeys.me())).toEqual({ name: null });
    expect(getData<Completion[]>(env, LATEST)?.map((c) => c.id)).toEqual([
      env.trash.id,
      env.prev.id,
    ]);
  });
});

describe('useUndoSignOff', () => {
  async function signedOff() {
    const env = seeded();
    env.api.on('POST /api/completions', (call) => {
      const body = call.body as CreateCompletionReq;
      return jsonResponse(makeCompletion({ ...body }), 201);
    });
    const { result } = renderHook(() => ({ signOff: useSignOff(), undo: useUndoSignOff() }), {
      wrapper: env.wrapper,
    });
    let id = '';
    act(() => {
      id = result.current.signOff.mutate({
        taskId: 'chapia',
        doneOn: '2026-10-06',
        doneBy: 'JT',
      });
    });
    await waitFor(() => expect(result.current.signOff.isSuccess).toBe(true));
    return { ...env, result, id };
  }

  it('removes the sign-off and restores the previous latest', async () => {
    const env = await signedOff();
    const pending = deferred<Response>();
    env.api.on(`DELETE /api/completions/${env.id}`, () => pending.promise);

    act(() => env.result.current.undo.mutate(env.id));
    await waitFor(() =>
      expect(getData<Completion[]>(env, LATEST)?.map((c) => c.id)).toEqual([
        env.trash.id,
        env.prev.id,
      ]),
    );
    expect(getData<Completion[]>(env, OCT)?.map((c) => c.id)).toEqual([env.trash.id]);

    pending.resolve(jsonResponse({ ok: true }));
    await waitFor(() => expect(env.result.current.undo.isSuccess).toBe(true));
    expect(env.api.callsTo(`DELETE /api/completions/${env.id}`)).toHaveLength(1);
  });

  it('waits for a pending sign-off before sending the DELETE', async () => {
    const env = seeded();
    const post = deferred<Response>();
    env.api.on('POST /api/completions', () => post.promise);
    const { result } = renderHook(() => ({ signOff: useSignOff(), undo: useUndoSignOff() }), {
      wrapper: env.wrapper,
    });
    let id = '';
    act(() => {
      id = result.current.signOff.mutate({
        taskId: 'chapia',
        doneOn: '2026-10-06',
        doneBy: 'JT',
      });
    });
    env.api.on(`DELETE /api/completions/${id}`, { ok: true });
    await waitFor(() => expect(env.api.callsTo('POST /api/completions')).toHaveLength(1));

    act(() => result.current.undo.mutate(id));
    // Optimistically undone at once, but the DELETE holds until the POST lands.
    await waitFor(() => expect(getData<Completion[]>(env, LATEST)?.[0]?.id).toBe(env.trash.id));
    await new Promise((r) => setTimeout(r, 20));
    expect(env.api.callsTo(`DELETE /api/completions/${id}`)).toHaveLength(0);

    post.resolve(jsonResponse(makeCompletion({ id, doneOn: '2026-10-06' }), 201));
    await waitFor(() => expect(result.current.undo.isSuccess).toBe(true));
    expect(env.api.callsTo(`DELETE /api/completions/${id}`)).toHaveLength(1);
  });

  it('skips the DELETE when the pending sign-off fails', async () => {
    const env = seeded();
    const post = deferred<Response>();
    env.api.on('POST /api/completions', () => post.promise);
    const { result } = renderHook(() => ({ signOff: useSignOff(), undo: useUndoSignOff() }), {
      wrapper: env.wrapper,
    });
    let id = '';
    act(() => {
      id = result.current.signOff.mutate({
        taskId: 'chapia',
        doneOn: '2026-10-06',
        doneBy: 'JT',
      });
    });
    await waitFor(() => expect(env.api.callsTo('POST /api/completions')).toHaveLength(1));
    act(() => result.current.undo.mutate(id));
    post.resolve(jsonResponse({ error: 'nope' }, 400));
    await waitFor(() => expect(result.current.undo.isSuccess).toBe(true));
    expect(env.api.callsTo(`DELETE /api/completions/${id}`)).toHaveLength(0);
    expect(getData<Completion[]>(env, LATEST)?.map((c) => c.id)).toEqual([
      env.trash.id,
      env.prev.id,
    ]);
  });

  it('rolls back when the delete fails', async () => {
    const env = await signedOff();
    const afterSignOff = { latest: getData(env, LATEST) };
    env.api.on(`DELETE /api/completions/${env.id}`, jsonResponse({ error: 'boom' }, 500));

    act(() => env.result.current.undo.mutate(env.id));
    await waitFor(() => expect(env.result.current.undo.isError).toBe(true));
    expect(getData(env, LATEST)).toEqual(afterSignOff.latest);
  });

  it('falls back to the newest cached sign-off when the displaced entry is unknown', async () => {
    const env = seeded();
    const fresh = makeCompletion({ doneOn: '2026-10-04' });
    env.qc.setQueryData<Completion[]>(LATEST, [fresh, env.trash]);
    env.qc.setQueryData<Completion[]>(OCT, [fresh, env.trash]);
    env.api.on(`DELETE /api/completions/${fresh.id}`, { ok: true });
    const { result } = renderHook(() => useUndoSignOff(), { wrapper: env.wrapper });

    await act(() => result.current.mutateAsync(fresh.id));
    expect(getData<Completion[]>(env, LATEST)?.map((c) => c.id)).toEqual([
      env.trash.id,
      env.prev.id,
    ]);
  });
});

describe('partial sign-offs', () => {
  const full = () => makeCompletion({ taskId: 't', doneOn: '2026-10-06' });

  async function setup() {
    const env = setupApi();
    env.qc.setQueryData<Me>(queryKeys.me(), { name: 'JT' });
    env.api.on('GET /api/tasks', { tasks: [makeTask({ id: 't' })] });
    const f = full();
    const server: Completion[] = [f];
    env.qc.setQueryData<Completion[]>(LATEST, [f]);
    env.api.on('GET /api/completions/latest', () => jsonResponse({ completions: server }));
    env.api.on('POST /api/completions', (call) => {
      const row = makeCompletion(call.body as object);
      server.unshift(row);
      return jsonResponse(row, 201);
    });
    const hook = renderHook(
      () => ({
        statuses: useTaskStatuses('2026-10-08'),
        signOff: useSignOff(),
        undo: useUndoSignOff(),
      }),
      { wrapper: env.wrapper },
    );
    await waitFor(() => expect(hook.result.current.statuses.data).toBeDefined());
    return { env, hook, full: f, server };
  }

  it('an optimistic partial adds inProgress but keeps the schedule, and undo restores it', async () => {
    const { env, hook, full: f, server } = await setup();
    const before = hook.result.current.statuses.data?.byId.get('t');
    expect(before).toMatchObject({ state: 'ok', nextDue: '2026-10-20' });
    expect(before?.inProgress).toBeUndefined();

    let id = '';
    act(() => {
      id = hook.result.current.signOff.mutate({
        taskId: 't',
        doneOn: '2026-10-08',
        doneBy: 'Dario',
        partial: true,
        note: 'Edges left',
      });
    });
    await waitFor(() =>
      expect(hook.result.current.statuses.data?.byId.get('t')?.inProgress).toMatchObject({
        on: '2026-10-08',
        note: 'Edges left',
      }),
    );
    expect(hook.result.current.statuses.data?.byId.get('t')).toMatchObject({
      nextDue: '2026-10-20',
      lastDone: '2026-10-06',
    });
    const cached = getData<Completion[]>(env, LATEST) ?? [];
    expect(cached.map((c) => [c.id === f.id, c.partial])).toEqual([
      [false, true],
      [true, false],
    ]);

    await waitFor(() => expect(hook.result.current.signOff.isSuccess).toBe(true));
    env.api.on(`DELETE /api/completions/${id}`, () => {
      server.shift();
      return jsonResponse({ ok: true });
    });
    act(() => hook.result.current.undo.mutate(id));
    await waitFor(() => {
      const s = hook.result.current.statuses.data?.byId.get('t');
      expect(s?.inProgress).toBeUndefined();
      expect(s).toMatchObject({ state: 'ok', nextDue: '2026-10-20' });
    });
  });
});

describe('useTaskStatuses', () => {
  const LATEST_PATH = 'GET /api/completions/latest';

  it('derives statuses from tasks + latest completions and flips them on sign-off', async () => {
    const env = setupApi();
    const server: Completion[] = [makeCompletion({ taskId: 'chapia', doneOn: '2026-10-06' })];
    env.api.on('GET /api/tasks', {
      tasks: [makeTask({ id: 'chapia' }), makeTask({ id: 'other-task' })],
    });
    env.api.on(LATEST_PATH, () => jsonResponse({ completions: server }));
    env.api.on('POST /api/completions', (call) => {
      const row = makeCompletion(call.body as object);
      server.unshift(row);
      return jsonResponse(row, 201);
    });

    const { result } = renderHook(
      () => ({ statuses: useTaskStatuses('2026-10-07'), signOff: useSignOff() }),
      { wrapper: env.wrapper },
    );
    await waitFor(() => expect(result.current.statuses.data).toBeDefined());

    const data = result.current.statuses.data!;
    expect(data.byId.get('chapia')).toMatchObject({
      state: 'ok',
      lastDone: '2026-10-06',
      nextDue: '2026-10-20',
    });
    expect(data.byId.get('other-task')?.state).toBe('never');
    expect(data.list[0]?.state).toBe('never');
    expect(data.percentOnTrack).toBe(50);

    act(() => {
      result.current.signOff.mutate({ taskId: 'other-task', doneOn: '2026-10-07', doneBy: 'JT' });
    });
    await waitFor(() =>
      expect(result.current.statuses.data?.byId.get('other-task')?.state).toBe('ok'),
    );
    await waitFor(() => expect(result.current.signOff.isSuccess).toBe(true));
    // The refetch after settling agrees with the optimistic state.
    await waitFor(() => expect(env.api.callsTo(LATEST_PATH)).toHaveLength(2));
    expect(result.current.statuses.data?.byId.get('other-task')?.lastDone).toBe('2026-10-07');
  });

  it('has no data while the task list is still loading', async () => {
    const env = setupApi();
    const tasks = deferred<Response>();
    env.api.on('GET /api/tasks', () => tasks.promise);
    env.api.on(LATEST_PATH, { completions: [] });
    const { result } = renderHook(() => useTaskStatuses('2026-10-07'), { wrapper: env.wrapper });

    await waitFor(() => expect(env.api.callsTo(LATEST_PATH)).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(false);

    tasks.resolve(jsonResponse({ tasks: [makeTask({ id: 'chapia' })] }));
    await waitFor(() => expect(result.current.data?.list).toHaveLength(1));
    expect(result.current.isPending).toBe(false);
  });

  it('reports an error, never a percentage, when the task list fails', async () => {
    const env = setupApi();
    env.api.on('GET /api/tasks', jsonResponse({ error: 'boom' }, 500));
    env.api.on(LATEST_PATH, { completions: [] });
    const { result } = renderHook(() => useTaskStatuses('2026-10-07'), { wrapper: env.wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  it('reports an error when the latest completions fail', async () => {
    const env = setupApi();
    env.api.on('GET /api/tasks', { tasks: [] });
    env.api.on(LATEST_PATH, jsonResponse({ error: 'boom' }, 500));
    const { result } = renderHook(() => useTaskStatuses('2026-10-07'), { wrapper: env.wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('an empty task list that loaded is a true 100%', async () => {
    const env = setupApi();
    env.api.on('GET /api/tasks', { tasks: [] });
    env.api.on(LATEST_PATH, { completions: [] });
    const { result } = renderHook(() => useTaskStatuses('2026-10-07'), { wrapper: env.wrapper });
    await waitFor(() => expect(result.current.data?.percentOnTrack).toBe(100));
  });
});

describe('useCompletions', () => {
  it('fetches a range under its normalised key and respects `enabled`', async () => {
    const env = setupApi();
    const row = makeCompletion({ doneOn: '2026-10-02' });
    env.api.on('GET /api/completions', { completions: [row] });
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useCompletions({ from: '2026-10-01', to: '2026-10-31', task: '' }, { enabled }),
      { wrapper: env.wrapper, initialProps: { enabled: false } },
    );
    expect(env.api.calls).toHaveLength(0);

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.data).toEqual([row]));
    const call = env.api.callsTo('GET /api/completions')[0];
    expect(call?.search.toString()).toBe('from=2026-10-01&to=2026-10-31');
    expect(env.qc.getQueryData(OCT)).toEqual([row]);
  });
});
