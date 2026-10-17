/**
 * GET  /api/tasks[?archived=1]  (public) → TasksRes, active tasks by title (archived included on request)
 * POST /api/tasks TaskInput (session) → TaskRes (201). The id is a slug made from the title.
 */
import {
  type TaskRes,
  type TasksRes,
  createTaskReqSchema,
  tasksQuerySchema,
} from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  getTask,
  insertTask,
  isUniqueViolation,
  json,
  listTasks,
  readJson,
  readQuery,
  requireUser,
  route,
  slugify,
  taskIdExists,
  toTask,
} from '../../../server/lib';

/** `base`, else `base-2`, `base-3`, ... checked against every row (archived included). */
async function freeId(db: D1Database, base: string): Promise<string> {
  if (!(await taskIdExists(db, base))) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await taskIdExists(db, candidate))) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export const onRequestGet = route(async ({ request, env }) => {
  const q = readQuery(request, tasksQuerySchema);
  const body: TasksRes = { tasks: await listTasks(env.DB, q.archived === '1') };
  return json(body);
});

export const onRequestPost = route(async (ctx) => {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const req = await readJson(ctx.request, createTaskReqSchema);
  const write = {
    title: req.title,
    titleEs: req.titleEs ?? null,
    steps: req.steps,
    stepsEs: req.stepsEs ?? null,
    safety: req.safety ?? null,
    kind: req.kind,
    intervalCount: req.kind === 'recurring' ? (req.intervalCount ?? null) : null,
    intervalUnit: req.kind === 'recurring' ? (req.intervalUnit ?? null) : null,
    dueOn: req.kind === 'once' ? (req.dueOn ?? null) : null,
    priority: req.priority,
  };
  const now = nowISO();
  // A concurrent create with the same title can win the id between check and insert: retry once.
  for (let attempt = 0; ; attempt++) {
    const id = await freeId(db, slugify(req.title));
    try {
      await insertTask(db, id, write, user, now);
    } catch (err) {
      if (attempt < 2 && isUniqueViolation(err)) continue;
      throw err;
    }
    const row = await getTask(db, id);
    if (!row) throw new Error('task vanished after insert');
    const body: TaskRes = { task: toTask(row) };
    return json(body, 201);
  }
});
