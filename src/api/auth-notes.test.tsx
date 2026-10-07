import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getCatalog, loadCatalog } from '../domain/catalog';
import type { Me, Note } from '../shared/api-schemas';
import { useLogin, useLogout, useSession } from './auth';
import { CatalogProvider, useApiClient, useCatalog, defaultApiClient } from './context';
import { queryKeys } from './keys';
import { useAddNote, useDeleteNote, useNotes } from './notes';
import { deferred, jsonResponse, makeNote, setupApi } from './test-utils';

describe('session hooks', () => {
  it('useSession reports pending, then signed out', async () => {
    const env = setupApi();
    env.api.on('GET /api/me', { name: null });
    const { result } = renderHook(() => useSession(), { wrapper: env.wrapper });
    expect(result.current).toEqual({ name: null, isSignedIn: false, isPending: true });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isSignedIn).toBe(false);
  });

  it('useLogin caches the session; a wrong code leaves it untouched', async () => {
    const env = setupApi();
    env.api.on('GET /api/me', { name: null });
    env.api.on('POST /api/login', (call) => {
      const { name, code } = call.body as { name: string; code: string };
      return code === 'right-code'
        ? jsonResponse({ name })
        : jsonResponse({ error: 'Wrong house code' }, 401);
    });
    const { result } = renderHook(() => ({ session: useSession(), login: useLogin() }), {
      wrapper: env.wrapper,
    });
    await waitFor(() => expect(result.current.session.isPending).toBe(false));

    await act(() =>
      result.current.login.mutateAsync({ name: 'José', code: 'wrong' }).catch(() => undefined),
    );
    await waitFor(() => expect(result.current.login.error).toMatchObject({ status: 401 }));
    expect(result.current.session.isSignedIn).toBe(false);

    await act(() => result.current.login.mutateAsync({ name: 'José', code: 'right-code' }));
    await waitFor(() =>
      expect(result.current.session).toMatchObject({ name: 'José', isSignedIn: true }),
    );
  });

  it('useLogout clears the session and drops cached notes', async () => {
    const env = setupApi();
    env.qc.setQueryData<Me>(queryKeys.me(), { name: 'JT' });
    env.qc.setQueryData<Note[]>(queryKeys.notes.all, [makeNote()]);
    env.api.on('POST /api/logout', { name: null });
    const { result } = renderHook(() => useLogout(), { wrapper: env.wrapper });

    await act(() => result.current.mutateAsync());
    expect(env.qc.getQueryData(queryKeys.me())).toEqual({ name: null });
    expect(env.qc.getQueryData(queryKeys.notes.all)).toBeUndefined();
  });
});

describe('useNotes', () => {
  it('never fetches notes while signed out', async () => {
    const env = setupApi();
    env.api.on('GET /api/me', { name: null });
    env.api.on('GET /api/notes', { notes: [] });
    const { result } = renderHook(() => ({ notes: useNotes(), session: useSession() }), {
      wrapper: env.wrapper,
    });
    await waitFor(() => expect(result.current.session.isPending).toBe(false));
    expect(result.current.notes.fetchStatus).toBe('idle');
    expect(env.api.callsTo('GET /api/notes')).toHaveLength(0);
  });

  it('fetches notes when signed in; a 401 flips the session to signed out', async () => {
    const env = setupApi();
    const note = makeNote();
    env.api.on('GET /api/me', { name: 'JT' });
    env.api.on('GET /api/notes', { notes: [note] });
    const { result } = renderHook(() => ({ notes: useNotes(), session: useSession() }), {
      wrapper: env.wrapper,
    });
    await waitFor(() => expect(result.current.notes.data).toEqual([note]));

    env.api.on('GET /api/notes', jsonResponse({ error: 'Sign in required' }, 401));
    await act(() => result.current.notes.refetch());
    await waitFor(() => expect(result.current.session.isSignedIn).toBe(false));
  });
});

describe('note mutations', () => {
  function seeded(notes: Note[]) {
    const env = setupApi();
    env.qc.setQueryData<Me>(queryKeys.me(), { name: 'JT' });
    env.qc.setQueryData<Note[]>(queryKeys.notes.all, notes);
    return env;
  }

  it('useAddNote inserts optimistically (after pinned notes) and rolls back on error', async () => {
    const pinned = makeNote({ pinned: true, createdAt: '2026-01-01T00:00:00.000Z' });
    const env = seeded([pinned]);
    const pending = deferred<Response>();
    env.api.on('POST /api/notes', () => pending.promise);
    const { result } = renderHook(() => useAddNote(), { wrapper: env.wrapper });

    let id = '';
    act(() => {
      id = result.current.mutate({ body: '  Vet: Dr. Mora  ' });
    });
    await waitFor(() =>
      expect(env.qc.getQueryData<Note[]>(queryKeys.notes.all)?.map((n) => n.id)).toEqual([
        pinned.id,
        id,
      ]),
    );
    expect(env.qc.getQueryData<Note[]>(queryKeys.notes.all)?.[1]).toMatchObject({
      author: 'JT',
      body: 'Vet: Dr. Mora',
      pinned: false,
    });

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(env.qc.getQueryData(queryKeys.notes.all)).toEqual([pinned]);
  });

  it('useDeleteNote removes optimistically', async () => {
    const note = makeNote();
    const env = seeded([note]);
    env.api.on(`DELETE /api/notes/${note.id}`, { ok: true });
    const { result } = renderHook(() => useDeleteNote(), { wrapper: env.wrapper });

    await act(() => result.current.mutateAsync(note.id));
    expect(env.qc.getQueryData(queryKeys.notes.all)).toEqual([]);
  });
});

describe('catalog & client context', () => {
  it('useCatalog defaults to the bundled catalog', () => {
    const { result } = renderHook(() => useCatalog());
    expect(result.current).toBe(getCatalog());
    expect(result.current.taskById.get('mow-lawn')?.id).toBe('mow-lawn');
  });

  it('CatalogProvider injects a catalog', () => {
    const bundled = getCatalog();
    const custom = loadCatalog({
      tasks: bundled.tasks.slice(0, 1),
      supplies: bundled.supplies,
      house: bundled.house,
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CatalogProvider catalog={custom}>{children}</CatalogProvider>
    );
    const { result } = renderHook(() => useCatalog(), { wrapper });
    expect(result.current.tasks).toHaveLength(1);
  });

  it('useApiClient defaults to the same-origin client', () => {
    const { result } = renderHook(() => useApiClient());
    expect(result.current).toBe(defaultApiClient);
  });
});
