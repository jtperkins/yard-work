/**
 * Server test harness (plan §14.5).
 *
 * - `getPlatformProxy()` from wrangler gives a real local D1 binding (Miniflare/workerd),
 *   in-memory (`persist: false`), one per test file.
 * - `applyMigrations` runs migrations/*.sql; `resetDb` truncates tables between tests.
 * - `makeContext` builds a Pages Functions `EventContext` to call handlers directly.
 * - `api()` dispatches a request through `_middleware.ts` + the matching route module,
 *   mirroring Pages file-based routing for functions/api/** (verified against
 *   `wrangler pages dev` manually), so auth gating is exercised exactly as deployed.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import * as catchall from '../../functions/api/[[catchall]]';
import { onRequest as middleware } from '../../functions/api/_middleware';
import * as completionById from '../../functions/api/completions/[id]';
import * as completions from '../../functions/api/completions/index';
import * as completionsLatest from '../../functions/api/completions/latest';
import * as login from '../../functions/api/login';
import * as logout from '../../functions/api/logout';
import * as me from '../../functions/api/me';
import * as noteById from '../../functions/api/notes/[id]';
import * as notes from '../../functions/api/notes/index';
import * as planById from '../../functions/api/plan/[id]';
import * as plan from '../../functions/api/plan/index';
import { SESSION_COOKIE } from '../../src/shared/api-schemas';
import { type AppContext, type AppData, type Env, signSession } from '../lib';

export const TEST_HOUSE_CODE = 'tortuga-verde-42';
export const TEST_SESSION_SECRET = 'test-session-secret-0123456789abcdef';

/** Catalog ids from the Phase 1 stub — the only ones guaranteed to stay. */
export const STUB_TASK_IDS = ['rust-inspection', 'mow-lawn', 'daily-cat-care'] as const;

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

/** Splits a migration file into statements (comments stripped; they contain no semicolons). */
export function migrationStatements(sql: string): string[] {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function applyMigrations(db: D1Database): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const stmts = migrationStatements(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    await db.batch(stmts.map((s) => db.prepare(s)));
  }
}

export async function resetDb(db: D1Database): Promise<void> {
  await db.batch(['completions', 'plan_items', 'notes'].map((t) => db.prepare(`DELETE FROM ${t}`)));
}

export interface Harness {
  env: Env;
  db: D1Database;
  dispose: () => Promise<void>;
}

/** Starts Miniflare with an in-memory D1 and applies the migrations. */
export async function createHarness(): Promise<Harness> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false, envFiles: [] });
  const env: Env = {
    DB: proxy.env.DB,
    HOUSE_CODE: TEST_HOUSE_CODE,
    SESSION_SECRET: TEST_SESSION_SECRET,
  };
  await applyMigrations(env.DB);
  return { env, db: env.DB, dispose: () => proxy.dispose() };
}

// ---------------------------------------------------------------------------
// Contexts & dispatch
// ---------------------------------------------------------------------------

type Handler = (ctx: AppContext) => Response | Promise<Response>;

export interface MakeContextOptions {
  request: Request;
  env: Env;
  /** pre-set `context.data.user` (skips cookie parsing when calling a handler directly) */
  user?: string | null;
  params?: Record<string, string | string[]>;
  next?: () => Promise<Response>;
}

export function makeContext({
  request,
  env,
  user = null,
  params = {},
  next,
}: MakeContextOptions): AppContext {
  const data: AppData = { user };
  return {
    request: request as AppContext['request'],
    functionPath: new URL(request.url).pathname,
    waitUntil: () => {},
    passThroughOnException: () => {},
    next: next ?? (() => Promise.resolve(new Response('static asset', { status: 200 }))),
    env: { ...env, ASSETS: { fetch } },
    params,
    data,
  };
}

/** Route table mirroring functions/api/** (static segments win over `:id`, then catch-all). */
const ROUTES: ReadonlyArray<readonly [pattern: string, mod: Record<string, unknown>]> = [
  ['/api/login', login],
  ['/api/logout', logout],
  ['/api/me', me],
  ['/api/completions', completions],
  ['/api/completions/latest', completionsLatest],
  ['/api/completions/:id', completionById],
  ['/api/plan', plan],
  ['/api/plan/:id', planById],
  ['/api/notes', notes],
  ['/api/notes/:id', noteById],
];

function match(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split('/');
  const s = pathname.replace(/\/+$/, '').split('/');
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i] as string;
    const val = s[i] as string;
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(val);
    else if (seg !== val) return null;
  }
  return params;
}

function resolve(
  method: string,
  pathname: string,
): { handler: Handler; params: Record<string, string> } {
  const key = `onRequest${method.charAt(0)}${method.slice(1).toLowerCase()}`;
  for (const [pattern, mod] of ROUTES) {
    const params = match(pattern, pathname);
    if (!params) continue;
    const handler = (mod[key] ?? mod.onRequest) as Handler | undefined;
    if (handler) return { handler, params };
  }
  return { handler: catchall.onRequest as Handler, params: {} };
}

export interface ApiOptions {
  method?: string;
  /** JSON-encoded with `Content-Type: application/json` unless `rawBody` is given */
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
  /** sign in as this name (valid cookie) */
  as?: string;
  /** raw `yw_session` cookie value (for tamper/expiry tests) */
  cookie?: string;
  origin?: string;
}

export interface ApiResult<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
}

/** Sends a request through middleware + route, like Pages would. */
export async function api<T = unknown>(
  h: Harness,
  path: string,
  opts: ApiOptions = {},
): Promise<ApiResult<T>> {
  const method = (opts.method ?? 'GET').toUpperCase();
  const headers = new Headers(opts.headers);
  let body: string | undefined = opts.rawBody;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }
  const cookie =
    opts.cookie ?? (opts.as ? await signSession(opts.as, h.env.SESSION_SECRET) : undefined);
  if (cookie !== undefined) headers.set('cookie', `${SESSION_COOKIE}=${cookie}`);

  const request = new Request(`${opts.origin ?? 'http://localhost:8788'}${path}`, {
    method,
    headers,
    body,
  });
  const { handler, params } = resolve(method, new URL(request.url).pathname);
  const ctx = makeContext({ request, env: h.env, params });
  ctx.next = () => Promise.resolve(handler(ctx));
  const res = await middleware(ctx);
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    body: (text ? JSON.parse(text) : null) as T,
  };
}

export const uuid = () => crypto.randomUUID();

/** Waits a few ms so consecutive rows get distinct `created_at` timestamps (ordering tests). */
export const tick = (ms = 3) => new Promise<void>((resolve) => setTimeout(resolve, ms));
