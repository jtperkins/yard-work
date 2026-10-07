/**
 * PATCH  /api/plan/:id UpdatePlanItemReq (session) → PlanItem (409 if done)
 * DELETE /api/plan/:id (session) → OkRes, hard delete (409 if done)
 */
import { type OkRes, updatePlanItemReqSchema } from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  conflict,
  deletePlanItem,
  getPlanItem,
  json,
  notFound,
  readIdParam,
  readJson,
  requireUser,
  route,
  toPlanItem,
  updatePlanItem,
} from '../../../server/lib';

const DONE = 'That plan item is signed off — undo the sign-off first';

export const onRequestPatch = route<'id'>(async (ctx) => {
  requireUser(ctx);
  const db = ctx.env.DB;
  const id = readIdParam(ctx.params);
  const patch = await readJson(ctx.request, updatePlanItemReqSchema);

  const item = await getPlanItem(db, id);
  if (!item) throw notFound('Plan item not found');
  if (item.status === 'done') throw conflict(DONE);
  if (!(await updatePlanItem(db, id, patch, nowISO()))) {
    // Signed off (or removed) between the read and the write.
    if (await getPlanItem(db, id)) throw conflict(DONE);
    throw notFound('Plan item not found');
  }
  const updated = await getPlanItem(db, id);
  if (!updated) throw notFound('Plan item not found');
  return json(toPlanItem(updated));
});

export const onRequestDelete = route<'id'>(async (ctx) => {
  requireUser(ctx);
  const db = ctx.env.DB;
  const id = readIdParam(ctx.params);
  const item = await getPlanItem(db, id);
  if (!item) throw notFound('Plan item not found');
  if (item.status === 'done') throw conflict(DONE);
  if (!(await deletePlanItem(db, id)) && (await getPlanItem(db, id))) throw conflict(DONE);
  const body: OkRes = { ok: true };
  return json(body);
});
