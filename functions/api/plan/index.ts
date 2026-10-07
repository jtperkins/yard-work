/**
 * GET  /api/plan?week=YYYY-MM-DD (public) → PlanRes (400 unless week is a Monday)
 * POST /api/plan CreatePlanItemReq (session) → PlanItem (201, or 200 on repeat id; 409 duplicate task)
 */
import {
  type PlanRes,
  createPlanItemReqSchema,
  planQuerySchema,
} from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  assertKnownTask,
  conflict,
  findPlanItemForTask,
  getPlanItem,
  insertPlanItem,
  isUniqueViolation,
  json,
  listPlanItems,
  readJson,
  readQuery,
  requireUser,
  route,
  toPlanItem,
} from '../../../server/lib';

const DUPLICATE = 'That task is already planned for this week';

export const onRequestGet = route(async ({ request, env }) => {
  const { week } = readQuery(request, planQuerySchema);
  const body: PlanRes = { items: await listPlanItems(env.DB, week) };
  return json(body);
});

export const onRequestPost = route(async (ctx) => {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const req = await readJson(ctx.request, createPlanItemReqSchema);

  const existing = await getPlanItem(db, req.id);
  if (existing) return json(toPlanItem(existing), 200);

  assertKnownTask(req.taskId);
  if (req.taskId !== undefined && (await findPlanItemForTask(db, req.weekStart, req.taskId))) {
    throw conflict(DUPLICATE);
  }

  try {
    await insertPlanItem(db, {
      id: req.id,
      weekStart: req.weekStart,
      taskId: req.taskId ?? null,
      title: req.title ?? null,
      assignee: req.assignee ?? null,
      note: req.note ?? null,
      createdBy: user,
      now: nowISO(),
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const raced = await getPlanItem(db, req.id);
    if (raced) return json(toPlanItem(raced), 200);
    throw conflict(DUPLICATE);
  }
  const stored = await getPlanItem(db, req.id);
  if (!stored) throw new Error('plan item vanished after insert');
  return json(toPlanItem(stored), 201);
});
