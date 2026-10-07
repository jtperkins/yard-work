/**
 * JSON responses, typed HTTP errors and cookie helpers for Pages Functions.
 * Every error response body is `ApiError` = `{ error: string }`.
 */
import type { ApiError } from '../../src/shared/api-schemas';
import type { AppContext } from './env';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // API responses are per-user and change constantly; never let a cache keep them.
  'cache-control': 'no-store',
} as const;

/** JSON response with no-store caching. */
export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const h = new Headers(JSON_HEADERS);
  if (headers) new Headers(headers).forEach((value, key) => h.append(key, value));
  return new Response(JSON.stringify(data), { status, headers: h });
}

export function errorResponse(status: number, message: string, headers?: HeadersInit): Response {
  const body: ApiError = { error: message };
  return json(body, status, headers);
}

/** Throw from a handler to answer with `{ error }` and the given status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what = 'Not found') => new HttpError(404, what);
export const conflict = (message: string) => new HttpError(409, message);
export const badRequest = (message: string) => new HttpError(400, message);
/** The resource existed but was deleted (e.g. a create replayed after its row was undone). */
export const gone = (message: string) => new HttpError(410, message);

/** Maps any thrown value to a JSON error response (unexpected errors → 500, logged). */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof HttpError) return errorResponse(err.status, err.message);
  console.error('Unhandled API error', err);
  return errorResponse(500, 'Internal server error');
}

/**
 * Wraps a route handler so `HttpError`s (and unexpected errors) become JSON responses.
 * `functions/**` exports `onRequestXxx = route(async (ctx) => ...)`.
 */
export function route<P extends string = string>(
  handler: (ctx: AppContext<P>) => Promise<Response>,
): (ctx: AppContext<P>) => Promise<Response> {
  return async (ctx) => {
    try {
      return await handler(ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** The signed-in user's name, or a 401 (middleware already gates writes; this narrows the type). */
export function requireUser(ctx: { data: { user: string | null } }): string {
  if (!ctx.data.user) throw new HttpError(401, 'Sign in required');
  return ctx.data.user;
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

/** Reads one cookie value from the request's `Cookie` header (undefined when absent). */
export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

export interface CookieOptions {
  maxAge: number;
  secure: boolean;
  httpOnly?: boolean;
  sameSite?: 'Lax' | 'Strict';
  path?: string;
}

/** `Set-Cookie` header value. Values must already be cookie-safe (we only set base64url tokens). */
export function serializeCookie(name: string, value: string, opts: CookieOptions): string {
  const parts = [
    `${name}=${value}`,
    `Path=${opts.path ?? '/'}`,
    `Max-Age=${Math.max(0, Math.floor(opts.maxAge))}`,
    `SameSite=${opts.sameSite ?? 'Lax'}`,
  ];
  if (opts.httpOnly ?? true) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

/** `Secure` only over https so plain-http localhost dev works (Safari drops Secure cookies there). */
export function isHttps(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}
