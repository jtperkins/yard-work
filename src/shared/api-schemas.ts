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
 * | GET    /api/completions/latest     | public        | —                       | CompletionsRes (newest full + newest partial per task) |
 * | POST   /api/completions            | session       | CreateCompletionReq     | Completion (201; 200 if repeat)|
 * | DELETE /api/completions/:id        | session       | —                       | OkRes (soft delete)            |
 * | GET    /api/tasks[?archived=1]     | public        | TasksQuery              | TasksRes (active, by title)    |
 * | POST   /api/tasks                  | session       | TaskInput               | TaskRes (201)                  |
 * | GET    /api/tasks/:id              | public        | —                       | TaskRes (archived too)         |
 * | PATCH  /api/tasks/:id              | session       | UpdateTaskReq           | TaskRes                        |
 * | GET    /api/incidents              | session       | —                       | IncidentsRes (newest first)    |
 * | POST   /api/incidents              | session       | CreateIncidentReq       | IncidentRes (201; 200 if repeat)|
 * | GET    /api/incidents/:id          | session       | —                       | IncidentRes                    |
 * | DELETE /api/incidents/:id          | session       | —                       | OkRes (soft delete)            |
 * | POST   /api/incidents/:id/files    | session       | raw file body           | IncidentFile (201)             |
 * | GET    /api/incidents/files/:fileId| session       | —                       | the file bytes                 |
 * | GET    /api/notes                  | session       | —                       | NotesRes (pinned first)        |
 * | POST   /api/notes                  | session       | CreateNoteReq           | Note (201; 200 if repeat)      |
 * | DELETE /api/notes/:id              | session       | —                       | OkRes (soft delete)            |
 *
 * Status codes: 400 validation, 401 no/invalid session or wrong house code, 404 unknown id/route,
 * 411/413/415 upload checks (incident files).
 */
import { z } from 'zod';
import { isISODate, isMonday } from './dates';

// ---------------------------------------------------------------------------
// Limits & primitives
// ---------------------------------------------------------------------------

/** kebab-case slug, e.g. `rust-inspection`. Stable forever (referenced by D1 rows). */
export const taskIdSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a kebab-case slug');
export type TaskId = string;

export const LIMITS = {
  name: 40,
  houseCode: 200,
  title: 120,
  note: 1000,
  noteBody: 4000,
  step: 300,
  steps: 30,
  safety: 1000,
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

const exactlyOneOfTaskOrTitle = (v: { taskId?: string | undefined; title?: string | undefined }) =>
  (v.taskId === undefined) !== (v.title === undefined);
const exactlyOneMessage = { message: 'provide exactly one of taskId or title', path: ['taskId'] };

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
  /** true = work started but not finished (the note says what is left) */
  partial: z.boolean(),
  createdAt: z.string(),
});
export type Completion = z.infer<typeof completionSchema>;

export const completionsResSchema = z.object({ completions: z.array(completionSchema) });
export type CompletionsRes = z.infer<typeof completionsResSchema>;

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
    partial: z.boolean().optional(),
  })
  .refine(exactlyOneOfTaskOrTitle, exactlyOneMessage)
  .refine((v) => !v.partial || v.note !== undefined, {
    message: 'a partial sign-off needs a note saying what is left',
    path: ['note'],
  });
export type CreateCompletionReq = z.input<typeof createCompletionReqSchema>;

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

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const TASK_KINDS = ['once', 'recurring'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];
export const INTERVAL_UNITS = ['day', 'week', 'month'] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];
export const PRIORITIES = ['low', 'normal', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const taskSchema = z.object({
  id: taskIdSchema,
  title: z.string(),
  titleEs: z.string().nullable(),
  steps: z.array(z.string()),
  stepsEs: z.array(z.string()).nullable(),
  safety: z.string().nullable(),
  kind: z.enum(TASK_KINDS),
  intervalCount: z.number().int().nullable(),
  intervalUnit: z.enum(INTERVAL_UNITS).nullable(),
  dueOn: z.string().nullable(),
  priority: z.enum(PRIORITIES),
  archivedAt: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const tasksResSchema = z.object({ tasks: z.array(taskSchema) });
export type TasksRes = z.infer<typeof tasksResSchema>;

export const taskResSchema = z.object({ task: taskSchema });
export type TaskRes = z.infer<typeof taskResSchema>;

/** Steps: trimmed, blank lines dropped. */
const stepsInput = z
  .array(z.string().trim().max(LIMITS.step))
  .max(LIMITS.steps)
  .transform((steps) => steps.filter((s) => s !== ''));

/** Nullable optional text for tasks: blank or null clears; omitted leaves it. */
const clearableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

const taskFields = {
  title: z.string().trim().min(1).max(LIMITS.title),
  titleEs: clearableText(LIMITS.title),
  steps: stepsInput,
  stepsEs: stepsInput.nullable().optional(),
  safety: clearableText(LIMITS.safety),
  kind: z.enum(TASK_KINDS),
  intervalCount: z.number().int().min(1).max(365).nullable().optional(),
  intervalUnit: z.enum(INTERVAL_UNITS).nullable().optional(),
  dueOn: isoDateSchema.nullable().optional(),
  priority: z.enum(PRIORITIES),
};

/** Recurring needs both interval fields, a one-off forbids them, and only a one-off has a due date. */
export function scheduleProblem(v: {
  kind: TaskKind;
  intervalCount?: number | null | undefined;
  intervalUnit?: IntervalUnit | null | undefined;
  dueOn?: string | null | undefined;
}): string | null {
  const hasInterval = v.intervalCount != null || v.intervalUnit != null;
  if (v.kind === 'recurring') {
    if (v.intervalCount == null || v.intervalUnit == null) {
      return 'a recurring task needs intervalCount and intervalUnit';
    }
    if (v.dueOn != null) return 'only a one-off task has a due date';
    return null;
  }
  return hasInterval ? 'a one-off task cannot have an interval' : null;
}

/** POST /api/tasks. */
export const createTaskReqSchema = z
  .object({
    ...taskFields,
    steps: stepsInput.optional().default([]),
    priority: z.enum(PRIORITIES).optional().default('normal'),
  })
  .superRefine((v, ctx) => {
    const problem = scheduleProblem(v);
    if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['kind'] });
  });
export type TaskInput = z.input<typeof createTaskReqSchema>;

/** PATCH /api/tasks/:id — every field optional, plus archive/unarchive. */
export const updateTaskReqSchema = z
  .object({
    title: taskFields.title.optional(),
    titleEs: taskFields.titleEs,
    steps: stepsInput.optional(),
    stepsEs: taskFields.stepsEs,
    safety: taskFields.safety,
    kind: taskFields.kind.optional(),
    intervalCount: taskFields.intervalCount,
    intervalUnit: taskFields.intervalUnit,
    dueOn: taskFields.dueOn,
    priority: taskFields.priority.optional(),
    archived: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'nothing to update' });
export type UpdateTaskReq = z.input<typeof updateTaskReqSchema>;

export const tasksQuerySchema = z.object({ archived: z.enum(['1']).optional() });

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export const INCIDENT_TYPES = ['sighting', 'poking-around', 'trespassing', 'other'] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

const MB = 1024 * 1024;

export const INCIDENT_LIMITS = {
  maxFiles: 10,
  imageBytes: 10 * MB,
  videoBytes: 50 * MB,
  pdfBytes: 10 * MB,
  fileName: 200,
  description: 4000,
  people: 1000,
  location: 200,
} as const;
export type IncidentLimits = { -readonly [K in keyof typeof INCIDENT_LIMITS]: number };

/** Allowed upload media types and which size cap each one uses. */
export const ALLOWED_TYPES = {
  'image/jpeg': 'imageBytes',
  'image/png': 'imageBytes',
  'image/webp': 'imageBytes',
  'image/heic': 'imageBytes',
  'image/heif': 'imageBytes',
  'video/mp4': 'videoBytes',
  'video/quicktime': 'videoBytes',
  'application/pdf': 'pdfBytes',
} as const satisfies Record<string, 'imageBytes' | 'videoBytes' | 'pdfBytes'>;
export type AllowedType = keyof typeof ALLOWED_TYPES;

export function isAllowedType(type: string): type is AllowedType {
  return Object.hasOwn(ALLOWED_TYPES, type);
}

export const incidentSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  type: z.enum(INCIDENT_TYPES),
  location: z.string().nullable(),
  description: z.string(),
  people: z.string().nullable(),
  reportedBy: z.string(),
  createdAt: z.string(),
});
export type Incident = z.infer<typeof incidentSchema>;

export const incidentFileSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  size: z.number().int(),
  uploadedBy: z.string(),
  createdAt: z.string(),
});
export type IncidentFile = z.infer<typeof incidentFileSchema>;

export const incidentsResSchema = z.object({
  incidents: z.array(incidentSchema.extend({ fileCount: z.number().int() })),
});
export type IncidentsRes = z.infer<typeof incidentsResSchema>;

export const incidentResSchema = z.object({
  incident: incidentSchema,
  files: z.array(incidentFileSchema),
});
export type IncidentRes = z.infer<typeof incidentResSchema>;

export const createIncidentReqSchema = z.object({
  id: idSchema,
  /** ISO UTC timestamp; the server rejects more than 5 minutes in the future. */
  occurredAt: z.iso.datetime(),
  type: z.enum(INCIDENT_TYPES),
  location: optionalText(INCIDENT_LIMITS.location),
  description: z.string().trim().min(1).max(INCIDENT_LIMITS.description),
  people: optionalText(INCIDENT_LIMITS.people),
});
export type CreateIncidentReq = z.input<typeof createIncidentReqSchema>;

/** Session cookie name (value format: see plan §14.4). */
export const SESSION_COOKIE = 'yw_session';
