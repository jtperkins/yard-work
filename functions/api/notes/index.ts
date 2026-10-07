/**
 * Handoff notes — session required for reading too (middleware enforces it).
 * GET  /api/notes → NotesRes, pinned first then newest
 * POST /api/notes CreateNoteReq → Note (201, or 200 on repeat id)
 */
import { type NotesRes, createNoteReqSchema } from '../../../src/shared/api-schemas';
import { nowISO } from '../../../src/shared/dates';
import {
  getNote,
  gone,
  insertNote,
  isUniqueViolation,
  json,
  listNotes,
  readJson,
  requireUser,
  route,
  toNote,
} from '../../../server/lib';

export const onRequestGet = route(async (ctx) => {
  requireUser(ctx);
  const body: NotesRes = { notes: await listNotes(ctx.env.DB) };
  return json(body);
});

export const onRequestPost = route(async (ctx) => {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const req = await readJson(ctx.request, createNoteReqSchema);

  const existing = await getNote(db, req.id);
  if (existing?.deleted_at) throw gone('That note was deleted');
  if (existing) return json(toNote(existing), 200);

  let created = true;
  try {
    await insertNote(db, {
      id: req.id,
      author: user,
      body: req.body,
      pinned: req.pinned ?? false,
      createdAt: nowISO(),
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    created = false; // a concurrent repeat POST won the race
  }
  const stored = await getNote(db, req.id);
  if (!stored) throw new Error('note vanished after insert');
  if (stored.deleted_at) throw gone('That note was deleted');
  return json(toNote(stored), created ? 201 : 200);
});
