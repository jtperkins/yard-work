/** DELETE /api/completions/:id (session) → OkRes. Soft delete. */
import type { OkRes } from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  getCompletion,
  json,
  notFound,
  readIdParam,
  requireUser,
  route,
  softDeleteCompletion,
} from '../../../server/lib';

export const onRequestDelete = route<'id'>(async (ctx) => {
  const user = requireUser(ctx);
  const id = readIdParam(ctx.params);
  const row = await getCompletion(ctx.env.DB, id);
  if (!row) throw notFound('Completion not found');
  // Already deleted → still OK, so a retried undo doesn't error.
  if (!row.deleted_at) await softDeleteCompletion(ctx.env.DB, row, user, nowISO());
  const body: OkRes = { ok: true };
  return json(body);
});
