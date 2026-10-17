/**
 * Test-only helpers for src/api: a routable fake `fetch`, response builders and a wrapper that
 * mounts hooks with a fresh QueryClient + injected API client. Not imported by app code.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Completion, Incident, IncidentFile, Note } from '../shared/api-schemas';
import { createApiClient, type ApiClient, type FetchLike } from './client';
import { ApiClientProvider } from './context';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export interface RecordedCall {
  method: string;
  path: string;
  search: URLSearchParams;
  body: unknown;
  init: RequestInit | undefined;
}

type Handler = (call: RecordedCall) => Response | Promise<Response>;

export interface FakeApi {
  fetch: FetchLike;
  calls: RecordedCall[];
  /** Registers a handler for e.g. `'POST /api/completions'` (replaces any previous one). */
  on(route: string, handler: Handler | Response | object): void;
  /** Calls for one route, e.g. `'GET /api/notes'`. */
  callsTo(route: string): RecordedCall[];
}

export function createFakeApi(): FakeApi {
  const handlers = new Map<string, Handler>();
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = async (input, init) => {
    const url = new URL(input, 'http://localhost');
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    const call: RecordedCall = { method, path: url.pathname, search: url.searchParams, body, init };
    calls.push(call);
    const handler = handlers.get(`${method} ${url.pathname}`);
    if (!handler) return jsonResponse({ error: 'Not found' }, 404);
    return handler(call);
  };
  return {
    fetch,
    calls,
    on(route, handler) {
      if (typeof handler === 'function') handlers.set(route, handler as Handler);
      else if (handler instanceof Response) handlers.set(route, () => handler.clone());
      else handlers.set(route, () => jsonResponse(handler));
    },
    callsTo(route) {
      const [method, path] = route.split(' ');
      return calls.filter((c) => c.method === method && c.path === path);
    },
  };
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: 0 },
    },
  });
}

export function createWrapper(qc: QueryClient, client: ApiClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

/** A fake API plus a query client and wrapper wired to it. */
export function setupApi() {
  const api = createFakeApi();
  const client = createApiClient({ fetch: api.fetch });
  const qc = createTestQueryClient();
  return { api, client, qc, wrapper: createWrapper(qc, client) };
}

// ---------------------------------------------------------------------------
// DTO builders
// ---------------------------------------------------------------------------

let seq = 0;
const uuid = () => {
  seq += 1;
  return `00000000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`;
};

export function makeCompletion(overrides: Partial<Completion> = {}): Completion {
  return {
    id: uuid(),
    taskId: 'chapia',
    title: null,
    doneOn: '2026-10-01',
    doneBy: 'JT',
    loggedBy: 'JT',
    note: null,
    planItemId: null,
    partial: false,
    createdAt: '2026-10-01T15:00:00.000Z',
    ...overrides,
  };
}

export function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: uuid(),
    occurredAt: '2026-10-16T20:30:00.000Z',
    type: 'sighting',
    location: 'Back gate',
    description: 'Man looking over the fence',
    people: null,
    reportedBy: 'JT',
    createdAt: '2026-10-16T21:00:00.000Z',
    ...overrides,
  };
}

export function makeIncidentFile(overrides: Partial<IncidentFile> = {}): IncidentFile {
  return {
    id: uuid(),
    incidentId: uuid(),
    fileName: 'photo.png',
    contentType: 'image/png',
    size: 1234,
    uploadedBy: 'JT',
    createdAt: '2026-10-16T21:05:00.000Z',
    ...overrides,
  };
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: uuid(),
    author: 'JT',
    body: 'Gate code is on the fridge',
    pinned: false,
    createdAt: '2026-10-01T15:00:00.000Z',
    ...overrides,
  };
}
