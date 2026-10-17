/**
 * GET    /api/incidents/:id (session) → IncidentRes (404 once deleted)
 * DELETE /api/incidents/:id (session) → OkRes (soft delete)
 */
import type { IncidentRes, OkRes } from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  getIncident,
  json,
  listIncidentFiles,
  notFound,
  readIdParam,
  requireUser,
  route,
  softDeleteIncident,
  toIncident,
  toIncidentFile,
} from '../../../server/lib';

export const onRequestGet = route<'id'>(async ({ params, env }) => {
  const row = await getIncident(env.DB, readIdParam(params));
  if (!row || row.deleted_at) throw notFound('Incident not found');
  const files = await listIncidentFiles(env.DB, row.id);
  const body: IncidentRes = { incident: toIncident(row), files: files.map(toIncidentFile) };
  return json(body);
});

export const onRequestDelete = route<'id'>(async (ctx) => {
  const user = requireUser(ctx);
  const row = await getIncident(ctx.env.DB, readIdParam(ctx.params));
  if (!row || row.deleted_at) throw notFound('Incident not found');
  await softDeleteIncident(ctx.env.DB, row.id, user, nowISO());
  const body: OkRes = { ok: true };
  return json(body);
});
