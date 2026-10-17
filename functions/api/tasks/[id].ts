/**
 * GET   /api/tasks/:id (public) → TaskRes (archived tasks too)
 * PATCH /api/tasks/:id UpdateTaskReq (session) → TaskRes. Edit fields, or archive/unarchive.
 */
import {
  type TaskRes,
  scheduleProblem,
  updateTaskReqSchema,
} from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  badRequest,
  getTask,
  json,
  notFound,
  readJson,
  readSlugParam,
  requireUser,
  route,
  toTask,
  updateTask,
} from '../../../server/lib';

/** The patched value, or the current one when the request leaves the field out. */
function patched<T>(value: T | undefined, current: T): T {
  return value === undefined ? current : value;
}

export const onRequestGet = route<'id'>(async ({ params, env }) => {
  const row = await getTask(env.DB, readSlugParam(params));
  if (!row) throw notFound('Task not found');
  const body: TaskRes = { task: toTask(row) };
  return json(body);
});

export const onRequestPatch = route<'id'>(async (ctx) => {
  requireUser(ctx);
  const db = ctx.env.DB;
  const id = readSlugParam(ctx.params);
  const patch = await readJson(ctx.request, updateTaskReqSchema);
  const row = await getTask(db, id);
  if (!row) throw notFound('Task not found');
  const current = toTask(row);
  const now = nowISO();

  const kind = patch.kind ?? current.kind;
  // Switching kind drops the fields that belong to the other kind.
  const merged = {
    title: patch.title ?? current.title,
    titleEs: patched(patch.titleEs, current.titleEs),
    steps: patch.steps ?? current.steps,
    stepsEs: patched(patch.stepsEs, current.stepsEs),
    safety: patched(patch.safety, current.safety),
    kind,
    intervalCount:
      kind === 'recurring' ? patched(patch.intervalCount, current.intervalCount) : null,
    intervalUnit: kind === 'recurring' ? patched(patch.intervalUnit, current.intervalUnit) : null,
    dueOn: kind === 'once' ? patched(patch.dueOn, current.dueOn) : null,
    priority: patch.priority ?? current.priority,
  };
  // Explicit fields from the request must still make sense for the resulting kind.
  const problem = scheduleProblem({
    kind,
    intervalCount: kind === 'once' ? patch.intervalCount : merged.intervalCount,
    intervalUnit: kind === 'once' ? patch.intervalUnit : merged.intervalUnit,
    dueOn: kind === 'recurring' ? patch.dueOn : merged.dueOn,
  });
  if (problem) throw badRequest(problem);

  let archivedAt = current.archivedAt;
  if (patch.archived === true) archivedAt = current.archivedAt ?? now;
  else if (patch.archived === false) archivedAt = null;
  await updateTask(db, id, merged, archivedAt, now);
  const updated = await getTask(db, id);
  if (!updated) throw notFound('Task not found');
  const body: TaskRes = { task: toTask(updated) };
  return json(body);
});
