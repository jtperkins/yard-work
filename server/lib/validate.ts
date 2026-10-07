/**
 * Request validation on top of the shared zod schemas (src/shared/api-schemas.ts), plus
 * catalog task-id checks against the bundled data/tasks.json.
 */
import type { z } from 'zod';
import tasksJson from '../../data/tasks.json';
import { idSchema } from '../../src/shared/api-schemas';
import { HttpError, badRequest, notFound } from './http';

/** Max accepted JSON body (largest legit body is a 4,000-char note). */
export const MAX_BODY_BYTES = 32 * 1024;

/** Task ids from the catalog bundled into the Functions build. */
export const KNOWN_TASK_IDS: ReadonlySet<string> = new Set(
  (tasksJson as ReadonlyArray<{ id: string }>).map((t) => t.id),
);

export function isKnownTaskId(id: string): boolean {
  return KNOWN_TASK_IDS.has(id);
}

/** Throws 400 when `taskId` is set but not in the catalog. */
export function assertKnownTask(taskId: string | undefined): void {
  if (taskId !== undefined && !isKnownTaskId(taskId)) {
    throw badRequest(`taskId: unknown task "${taskId}"`);
  }
}

/** `field: message; field2: message` from a zod error (first few issues). */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    )
    .join('; ');
}

export function parseWith<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest(formatZodError(result.error));
  return result.data;
}

/**
 * Parses and validates a JSON request body.
 * 415 unless `Content-Type: application/json` (also forces a CORS preflight for cross-site
 * callers), 413 when too large, 400 for malformed JSON or schema failures.
 */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Request body too large');
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw badRequest('Malformed JSON body');
  }
  return parseWith(schema, body);
}

/** Validates the query string (single-valued params only). */
export function readQuery<S extends z.ZodType>(request: Request, schema: S): z.output<S> {
  const params = new URL(request.url).searchParams;
  return parseWith(schema, Object.fromEntries(params));
}

/** A route `:id` param that must be a UUID — anything else can't exist, so 404. */
export function readIdParam(params: Record<string, string | string[]>, name = 'id'): string {
  const value = params[name];
  if (typeof value !== 'string' || !idSchema.safeParse(value).success) throw notFound();
  return value;
}
