/** DELETE /api/notes/:id (session) → OkRes. Soft delete (no editing: delete + repost). */
import type { OkRes } from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  getNote,
  json,
  notFound,
  readIdParam,
  requireUser,
  route,
  softDeleteNote,
} from '../../../server/lib';

export const onRequestDelete = route<'id'>(async (ctx) => {
  const user = requireUser(ctx);
  const id = readIdParam(ctx.params);
  const row = await getNote(ctx.env.DB, id);
  if (!row) throw notFound('Note not found');
  if (!row.deleted_at) await softDeleteNote(ctx.env.DB, id, user, nowISO());
  const body: OkRes = { ok: true };
  return json(body);
});
