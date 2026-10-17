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
  incidentFileSchema,
  incidentResSchema,
  incidentsResSchema,
  noteSchema,
  notesResSchema,
  okResSchema,
  taskResSchema,
  tasksResSchema,
  type Completion,
  type CompletionsQuery,
  type CreateCompletionReq,
  type CreateIncidentReq,
  type CreateNoteReq,
  type IncidentFile,
  type IncidentRes,
  type IncidentsRes,
  type LoginReq,
  type Me,
  type Note,
  type OkRes,
  type Task,
  type TaskInput,
  type UpdateTaskReq,
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

  listTasks(options?: { archived?: boolean }, signal?: AbortSignal): Promise<Task[]>;
  getTask(id: string, signal?: AbortSignal): Promise<Task>;
  createTask(req: TaskInput): Promise<Task>;
  updateTask(id: string, patch: UpdateTaskReq): Promise<Task>;

  listIncidents(signal?: AbortSignal): Promise<IncidentsRes['incidents']>;
  getIncident(id: string, signal?: AbortSignal): Promise<IncidentRes>;
  createIncident(req: CreateIncidentReq): Promise<IncidentRes>;
  deleteIncident(id: string): Promise<OkRes>;
  /** Uploads one file as the raw request body. `mediaType` is what the server checks. */
  uploadIncidentFile(incidentId: string, file: File, mediaType: string): Promise<IncidentFile>;

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
  /** Sent as is (not JSON) with these extra headers, e.g. a file upload. */
  raw?: { body: BodyInit; headers: Record<string, string> };
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
    if (spec.raw) {
      Object.assign(headers, spec.raw.headers);
      init.body = spec.raw.body;
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

    listTasks: async (options = {}, signal) =>
      (
        await request({
          method: 'GET',
          path: '/api/tasks',
          schema: tasksResSchema,
          query: { archived: options.archived ? '1' : undefined },
          signal,
        })
      ).tasks,
    getTask: async (id, signal) =>
      (
        await request({
          method: 'GET',
          path: `/api/tasks/${encode(id)}`,
          schema: taskResSchema,
          signal,
        })
      ).task,
    createTask: async (req) =>
      (await request({ method: 'POST', path: '/api/tasks', schema: taskResSchema, body: req }))
        .task,
    updateTask: async (id, patch) =>
      (
        await request({
          method: 'PATCH',
          path: `/api/tasks/${encode(id)}`,
          schema: taskResSchema,
          body: patch,
        })
      ).task,

    listIncidents: async (signal) =>
      (
        await request({
          method: 'GET',
          path: '/api/incidents',
          schema: incidentsResSchema,
          signal,
        })
      ).incidents,
    getIncident: (id, signal) =>
      request({
        method: 'GET',
        path: `/api/incidents/${encode(id)}`,
        schema: incidentResSchema,
        signal,
      }),
    createIncident: (req) =>
      request({ method: 'POST', path: '/api/incidents', schema: incidentResSchema, body: req }),
    deleteIncident: (id) =>
      request({ method: 'DELETE', path: `/api/incidents/${encode(id)}`, schema: okResSchema }),
    uploadIncidentFile: (incidentId, file, mediaType) =>
      request({
        method: 'POST',
        path: `/api/incidents/${encode(incidentId)}/files`,
        schema: incidentFileSchema,
        raw: {
          body: file,
          headers: { 'content-type': mediaType, 'x-file-name': encode(file.name) },
        },
      }),

    listNotes: async (signal) =>
      (await request({ method: 'GET', path: '/api/notes', schema: notesResSchema, signal })).notes,
    createNote: (req) =>
      request({ method: 'POST', path: '/api/notes', schema: noteSchema, body: req }),
    deleteNote: (id) =>
      request({ method: 'DELETE', path: `/api/notes/${encode(id)}`, schema: okResSchema }),
  };
}
