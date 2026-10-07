/**
 * Typed fetch client for the Pages Functions API (route table: src/shared/api-schemas.ts).
 *
 * - Request bodies are the shared `XxxReq` input types; responses are validated against the
 *   shared camelCase DTO schemas, so a server/client drift fails loudly instead of rendering junk.
 * - Every failure is an `ApiRequestError` (`status` 0 for network errors). Non-2xx bodies are the
 *   shared `{ error }` shape; anything else falls back to the status text.
 * - The session is an HttpOnly cookie, so requests are same-origin with credentials.
 * - `onUnauthorized` runs on any 401 except a failed login (wrong house code), so the app can
 *   drop the cached session when it expires mid-use.
 */
import type { z } from 'zod';
import {
  apiErrorSchema,
  completionSchema,
  completionsResSchema,
  meSchema,
  noteSchema,
  notesResSchema,
  okResSchema,
  planItemSchema,
  planResSchema,
  type Completion,
  type CompletionsQuery,
  type CreateCompletionReq,
  type CreateNoteReq,
  type CreatePlanItemReq,
  type LoginReq,
  type Me,
  type Note,
  type OkRes,
  type PlanItem,
  type UpdatePlanItemReq,
} from '../shared/api-schemas';
import { ApiRequestError } from './errors';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  /** Defaults to the global `fetch`, looked up per request (so tests can stub it). */
  fetch?: FetchLike;
  /** Prefix for every path; defaults to '' (same origin, `/api/...`). */
  baseUrl?: string;
  /** Called on a 401 from any endpoint other than login. */
  onUnauthorized?: () => void;
}

export interface ApiClient {
  me(signal?: AbortSignal): Promise<Me>;
  login(req: LoginReq): Promise<Me>;
  logout(): Promise<Me>;

  listCompletions(query?: CompletionsQuery, signal?: AbortSignal): Promise<Completion[]>;
  latestCompletions(signal?: AbortSignal): Promise<Completion[]>;
  createCompletion(req: CreateCompletionReq): Promise<Completion>;
  deleteCompletion(id: string): Promise<OkRes>;

  getPlan(weekStart: string, signal?: AbortSignal): Promise<PlanItem[]>;
  createPlanItem(req: CreatePlanItemReq): Promise<PlanItem>;
  updatePlanItem(id: string, patch: UpdatePlanItemReq): Promise<PlanItem>;
  deletePlanItem(id: string): Promise<OkRes>;

  listNotes(signal?: AbortSignal): Promise<Note[]>;
  createNote(req: CreateNoteReq): Promise<Note>;
  deleteNote(id: string): Promise<OkRes>;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestSpec<S extends z.ZodType> {
  method: Method;
  path: string;
  schema: S;
  body?: unknown;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal | undefined;
  /** Skip `onUnauthorized` (login: a 401 there means "wrong code", not "session expired"). */
  ignoreUnauthorized?: boolean;
}

function buildQuery(query: Record<string, string | undefined> | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

const encode = encodeURIComponent;

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? '';

  async function request<S extends z.ZodType>(spec: RequestSpec<S>): Promise<z.output<S>> {
    const doFetch: FetchLike = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    const headers: Record<string, string> = { accept: 'application/json' };
    const init: RequestInit = { method: spec.method, headers, credentials: 'same-origin' };
    if (spec.signal) init.signal = spec.signal;
    if (spec.body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(spec.body);
    }

    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${spec.path}${buildQuery(spec.query)}`, init);
    } catch (err) {
      // Let aborts (query cancellation) propagate untouched so TanStack Query recognises them.
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new ApiRequestError(0, 'Network request failed', 'network', { cause: err });
    }

    const body = await readBody(res);
    if (!res.ok) {
      if (res.status === 401 && !spec.ignoreUnauthorized) options.onUnauthorized?.();
      const parsedError = apiErrorSchema.safeParse(body);
      const message = parsedError.success
        ? parsedError.data.error
        : res.statusText || `Request failed (${res.status})`;
      throw new ApiRequestError(res.status, message, 'http');
    }

    const parsed = spec.schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(
        res.status,
        `Unexpected response from ${spec.method} ${spec.path}`,
        'invalid-response',
        { cause: parsed.error },
      );
    }
    return parsed.data;
  }

  return {
    me: (signal) => request({ method: 'GET', path: '/api/me', schema: meSchema, signal }),
    login: (req) =>
      request({
        method: 'POST',
        path: '/api/login',
        schema: meSchema,
        body: req,
        ignoreUnauthorized: true,
      }),
    logout: () => request({ method: 'POST', path: '/api/logout', schema: meSchema }),

    listCompletions: async (query = {}, signal) =>
      (
        await request({
          method: 'GET',
          path: '/api/completions',
          schema: completionsResSchema,
          query: { from: query.from, to: query.to, task: query.task },
          signal,
        })
      ).completions,
    latestCompletions: async (signal) =>
      (
        await request({
          method: 'GET',
          path: '/api/completions/latest',
          schema: completionsResSchema,
          signal,
        })
      ).completions,
    createCompletion: (req) =>
      request({ method: 'POST', path: '/api/completions', schema: completionSchema, body: req }),
    deleteCompletion: (id) =>
      request({ method: 'DELETE', path: `/api/completions/${encode(id)}`, schema: okResSchema }),

    getPlan: async (weekStart, signal) =>
      (
        await request({
          method: 'GET',
          path: '/api/plan',
          schema: planResSchema,
          query: { week: weekStart },
          signal,
        })
      ).items,
    createPlanItem: (req) =>
      request({ method: 'POST', path: '/api/plan', schema: planItemSchema, body: req }),
    updatePlanItem: (id, patch) =>
      request({
        method: 'PATCH',
        path: `/api/plan/${encode(id)}`,
        schema: planItemSchema,
        body: patch,
      }),
    deletePlanItem: (id) =>
      request({ method: 'DELETE', path: `/api/plan/${encode(id)}`, schema: okResSchema }),

    listNotes: async (signal) =>
      (await request({ method: 'GET', path: '/api/notes', schema: notesResSchema, signal })).notes,
    createNote: (req) =>
      request({ method: 'POST', path: '/api/notes', schema: noteSchema, body: req }),
    deleteNote: (id) =>
      request({ method: 'DELETE', path: `/api/notes/${encode(id)}`, schema: okResSchema }),
  };
}
