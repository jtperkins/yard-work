/**
 * GET  /api/completions?from=&to=&task=  (public) → CompletionsRes, newest first
 * POST /api/completions CreateCompletionReq (session) → Completion (201, or 200 on repeat id)
 */
import {
  type Completion,
  type CompletionsRes,
  DEFAULT_COMPLETIONS_LOOKBACK_DAYS,
  completionsQuerySchema,
  createCompletionReqSchema,
} from '../../../src/shared/api-schemas';
import { addDays, isFuture, nowISO, todayCR, weekStart } from '../../../src/shared/dates';
import {
  assertKnownTask,
  badRequest,
  conflict,
  findPlanItemForTask,
  getCompletion,
  gone,
  getPlanItem,
  insertCompletion,
  isUniqueViolation,
  json,
  listCompletions,
  readJson,
  readQuery,
  requireUser,
  route,
  toCompletion,
  type CompletionRow,
} from '../../../server/lib';

export const onRequestGet = route(async ({ request, env }) => {
  const q = readQuery(request, completionsQuerySchema);
  const to = q.to ?? todayCR();
  const from = q.from ?? addDays(to, -DEFAULT_COMPLETIONS_LOOKBACK_DAYS);
  if (from > to) throw badRequest('from: must be on or before to');
  const body: CompletionsRes = {
    completions: await listCompletions(env.DB, { from, to, taskId: q.task }),
  };
  return json(body);
});

/** A repeat id answers with the stored row, unless that sign-off was undone since (410). */
function replay(row: CompletionRow): Response {
  if (row.deleted_at) throw gone('That sign-off was undone');
  return json(toCompletion(row), 200);
}

export const onRequestPost = route(async (ctx) => {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const req = await readJson(ctx.request, createCompletionReqSchema);

  // Idempotent: a repeat POST (flaky connection, double tap) returns the stored row.
  const existing = await getCompletion(db, req.id);
  if (existing) return replay(existing);

  if (isFuture(req.doneOn)) throw badRequest('doneOn: cannot be in the future');
  assertKnownTask(req.taskId);

  let planItemId: string | null = null;
  if (req.planItemId !== undefined) {
    const item = await getPlanItem(db, req.planItemId);
    if (!item) throw badRequest('planItemId: unknown plan item');
    if (item.status === 'done') throw conflict('That plan item is already signed off');
    if (item.task_id !== null ? item.task_id !== req.taskId : req.taskId !== undefined) {
      throw badRequest('planItemId: plan item is for a different task');
    }
    planItemId = item.id;
  } else if (req.taskId !== undefined) {
    // Auto-link the planned item for this task in the week containing doneOn.
    const item = await findPlanItemForTask(db, weekStart(req.doneOn), req.taskId);
    if (item?.status === 'planned') planItemId = item.id;
  }

  const completion: Completion = {
    id: req.id,
    taskId: req.taskId ?? null,
    title: req.title ?? null,
    doneOn: req.doneOn,
    doneBy: req.doneBy,
    loggedBy: user,
    note: req.note ?? null,
    planItemId,
    createdAt: nowISO(),
  };
  try {
    await insertCompletion(db, completion);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const raced = await getCompletion(db, req.id);
    if (raced) return replay(raced);
    throw err;
  }
  const stored = await getCompletion(db, req.id);
  return json(stored ? toCompletion(stored) : completion, 201);
});
