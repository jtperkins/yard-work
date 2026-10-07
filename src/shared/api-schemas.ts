/**
 * HTTP API contract between the browser (src/api) and Pages Functions (functions/, server/).
 *
 * FROZEN in Phase 1 — later phases import these, never fork them; changes must be additive.
 *
 * - JSON is camelCase everywhere; the server maps snake_case D1 rows to these DTOs.
 * - Request schemas validate bodies/query strings. `XxxReq` types are the *input* shape a client
 *   sends (`z.input`); the server works with the parsed output (`z.output`, trimmed strings,
 *   blank optional text normalised to `undefined`).
 * - Every error response is `ApiError` = `{ error: string }`.
 *
 * Routes (see plan §4 + §14.3):
 *
 * | Method & path                      | Auth          | Request                 | Response (2xx)                 |
 * |------------------------------------|---------------|-------------------------|--------------------------------|
 * | POST   /api/login                  | —             | LoginReq                | Me (sets yw_session cookie)    |
 * | POST   /api/logout                 | —             | —                       | Me ({ name: null })            |
 * | GET    /api/me                     | —             | —                       | Me                             |
 * | GET    /api/completions            | public        | CompletionsQuery        | CompletionsRes (newest first)  |
 * | GET    /api/completions/latest     | public        | —                       | CompletionsRes (1 per task)    |
 * | POST   /api/completions            | session       | CreateCompletionReq     | Completion (201; 200 if repeat)|
 * | DELETE /api/completions/:id        | session       | —                       | OkRes (soft delete)            |
 * | GET    /api/plan?week=YYYY-MM-DD   | public        | PlanQuery               | PlanRes                        |
 * | POST   /api/plan                   | session       | CreatePlanItemReq       | PlanItem (201; 200 if repeat)  |
 * | PATCH  /api/plan/:id               | session       | UpdatePlanItemReq       | PlanItem                       |
 * | DELETE /api/plan/:id               | session       | —                       | OkRes                          |
 * | GET    /api/notes                  | session       | —                       | NotesRes (pinned first)        |
 * | POST   /api/notes                  | session       | CreateNoteReq           | Note (201; 200 if repeat)      |
 * | DELETE /api/notes/:id              | session       | —                       | OkRes (soft delete)            |
 *
 * Status codes: 400 validation, 401 no/invalid session or wrong house code, 404 unknown id/route,
 * 409 conflict (duplicate catalog task in a week; PATCH/DELETE on a `done` plan item).
 */
import { z } from 'zod';
import { taskIdSchema } from './catalog-schema';
import { isISODate, isMonday } from './dates';

// ---------------------------------------------------------------------------
// Limits & primitives
// ---------------------------------------------------------------------------

export const LIMITS = {
  name: 40,
  houseCode: 200,
  title: 120,
  note: 1000,
  noteBody: 4000,
} as const;

/** `YYYY-MM-DD` that is a real calendar date. */
export const isoDateSchema = z
  .string()
  .refine((v) => isISODate(v), { message: 'must be a date in YYYY-MM-DD form' });

/** A Monday `YYYY-MM-DD` (week key). */
export const weekStartSchema = isoDateSchema.refine((v) => isMonday(v), {
  message: 'must be a Monday',
});

/** Client-generated id (`crypto.randomUUID()`), used for idempotent POSTs. */
export const idSchema = z.uuid();

/** Person name: trimmed, 1–40 chars. Used for session names, doneBy, assignee. */
export const personNameSchema = z.string().trim().min(1).max(LIMITS.name);

/** Optional free text: trimmed; blank becomes `undefined`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Optional nullable text for PATCH: `null` or blank clears the field; omitted leaves it. */
const patchText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

const exactlyOneOfTaskOrTitle = (v: { taskId?: string | undefined; title?: string | undefined }) =>
  (v.taskId === undefined) !== (v.title === undefined);
const exactlyOneMessage = { message: 'provide exactly one of taskId or title', path: ['taskId'] };

export const PLAN_STATUSES = ['planned', 'done', 'skipped'] as const;
export const planStatusSchema = z.enum(PLAN_STATUSES);
export type PlanStatus = z.infer<typeof planStatusSchema>;

// ---------------------------------------------------------------------------
// Response DTOs
// ---------------------------------------------------------------------------

export const apiErrorSchema = z.object({ error: z.string() });
export type ApiError = z.infer<typeof apiErrorSchema>;

export const okResSchema = z.object({ ok: z.literal(true) });
export type OkRes = z.infer<typeof okResSchema>;

export const meSchema = z.object({ name: z.string().nullable() });
export type Me = z.infer<typeof meSchema>;

export const completionSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable(),
  title: z.string().nullable(),
  doneOn: z.string(),
  doneBy: z.string(),
  loggedBy: z.string(),
  note: z.string().nullable(),
  planItemId: z.string().nullable(),
  createdAt: z.string(),
});
export type Completion = z.infer<typeof completionSchema>;

export const completionsResSchema = z.object({ completions: z.array(completionSchema) });
export type CompletionsRes = z.infer<typeof completionsResSchema>;

/** Summary of the (non-deleted) completion linked to a plan item via completions.plan_item_id. */
export const planItemCompletionSchema = z.object({
  id: z.string(),
  doneOn: z.string(),
  doneBy: z.string(),
});
export type PlanItemCompletion = z.infer<typeof planItemCompletionSchema>;

export const planItemSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  taskId: z.string().nullable(),
  title: z.string().nullable(),
  assignee: z.string().nullable(),
  note: z.string().nullable(),
  status: planStatusSchema,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completion: planItemCompletionSchema.nullable(),
});
export type PlanItem = z.infer<typeof planItemSchema>;

export const planResSchema = z.object({ items: z.array(planItemSchema) });
export type PlanRes = z.infer<typeof planResSchema>;

export const noteSchema = z.object({
  id: z.string(),
  author: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  createdAt: z.string(),
});
export type Note = z.infer<typeof noteSchema>;

export const notesResSchema = z.object({ notes: z.array(noteSchema) });
export type NotesRes = z.infer<typeof notesResSchema>;

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export const loginReqSchema = z.object({
  name: personNameSchema,
  code: z.string().min(1).max(LIMITS.houseCode),
});
export type LoginReq = z.input<typeof loginReqSchema>;

export const createCompletionReqSchema = z
  .object({
    id: idSchema,
    taskId: taskIdSchema.optional(),
    title: z.string().trim().min(1).max(LIMITS.title).optional(),
    /** CR-local date; server rejects future dates (`isFuture`). */
    doneOn: isoDateSchema,
    doneBy: personNameSchema,
    note: optionalText(LIMITS.note),
    planItemId: idSchema.optional(),
  })
  .refine(exactlyOneOfTaskOrTitle, exactlyOneMessage);
export type CreateCompletionReq = z.input<typeof createCompletionReqSchema>;

export const createPlanItemReqSchema = z
  .object({
    id: idSchema,
    weekStart: weekStartSchema,
    taskId: taskIdSchema.optional(),
    title: z.string().trim().min(1).max(LIMITS.title).optional(),
    assignee: optionalText(LIMITS.name),
    note: optionalText(LIMITS.note),
  })
  .refine(exactlyOneOfTaskOrTitle, exactlyOneMessage);
export type CreatePlanItemReq = z.input<typeof createPlanItemReqSchema>;

export const updatePlanItemReqSchema = z
  .object({
    assignee: patchText(LIMITS.name),
    note: patchText(LIMITS.note),
    /** `done` is only reachable by signing off (POST /api/completions). */
    status: z.enum(['planned', 'skipped']).optional(),
  })
  .refine((v) => v.assignee !== undefined || v.note !== undefined || v.status !== undefined, {
    message: 'nothing to update',
  });
export type UpdatePlanItemReq = z.input<typeof updatePlanItemReqSchema>;

export const createNoteReqSchema = z.object({
  id: idSchema,
  body: z.string().trim().min(1).max(LIMITS.noteBody),
  pinned: z.boolean().optional(),
});
export type CreateNoteReq = z.input<typeof createNoteReqSchema>;

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

/** GET /api/completions — defaults: to = today (CR), from = to − 400 days. */
export const completionsQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  task: taskIdSchema.optional(),
});
export type CompletionsQuery = z.input<typeof completionsQuerySchema>;

/** Default look-back window for GET /api/completions when `from` is omitted. */
export const DEFAULT_COMPLETIONS_LOOKBACK_DAYS = 400;

/** GET /api/plan — `week` must be a Monday. */
export const planQuerySchema = z.object({ week: weekStartSchema });
export type PlanQuery = z.input<typeof planQuerySchema>;

/** Session cookie name (value format: see plan §14.4). */
export const SESSION_COOKIE = 'yw_session';
