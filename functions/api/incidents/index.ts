/**
 * GET  /api/incidents (session) → IncidentsRes, newest first
 * POST /api/incidents CreateIncidentReq (session) → IncidentRes (201, or 200 on a repeat id)
 */
import {
  type IncidentRes,
  type IncidentsRes,
  createIncidentReqSchema,
} from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  badRequest,
  getIncident,
  insertIncident,
  isUniqueViolation,
  json,
  listIncidentFiles,
  listIncidents,
  readJson,
  requireUser,
  route,
  toIncident,
  toIncidentFile,
} from '../../../server/lib';

/** Clock skew allowance for `occurredAt`. */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

export const onRequestGet = route(async ({ env }) => {
  const body: IncidentsRes = { incidents: await listIncidents(env.DB) };
  return json(body);
});

export const onRequestPost = route(async (ctx) => {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const req = await readJson(ctx.request, createIncidentReqSchema);

  const stored = async (status: number) => {
    const row = await getIncident(db, req.id);
    if (!row || row.deleted_at) return null;
    const files = await listIncidentFiles(db, req.id);
    const body: IncidentRes = { incident: toIncident(row), files: files.map(toIncidentFile) };
    return json(body, status);
  };

  // Idempotent: a repeat POST (flaky connection, double tap) returns the stored row.
  const existing = await stored(200);
  if (existing) return existing;

  if (Date.parse(req.occurredAt) > Date.now() + FUTURE_SLACK_MS) {
    throw badRequest('occurredAt: cannot be in the future');
  }
  try {
    await insertIncident(db, {
      id: req.id,
      occurredAt: new Date(req.occurredAt).toISOString(),
      type: req.type,
      location: req.location ?? null,
      description: req.description,
      people: req.people ?? null,
      reportedBy: user,
      createdAt: nowISO(),
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const raced = await stored(200);
    if (raced) return raced;
    throw err;
  }
  const created = await stored(201);
  if (!created) throw new Error('incident vanished after insert');
  return created;
});
