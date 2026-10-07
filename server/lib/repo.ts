/**
 * SQL access for D1. Maps snake_case rows to the camelCase DTOs in src/shared/api-schemas.ts.
 * Multi-statement writes use `db.batch` (one implicit transaction, statements run in order).
 */
import type { Completion, Note, PlanItem, PlanStatus } from '../../src/shared/api-schemas';

// ---------------------------------------------------------------------------
// Rows & mappers
// ---------------------------------------------------------------------------

export interface CompletionRow {
  id: string;
  task_id: string | null;
  title: string | null;
  done_on: string;
  done_by: string;
  logged_by: string;
  note: string | null;
  plan_item_id: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface PlanItemRow {
  id: string;
  week_start: string;
  task_id: string | null;
  title: string | null;
  assignee: string | null;
  note: string | null;
  status: PlanStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** joined: latest non-deleted completion linked via completions.plan_item_id */
  c_id: string | null;
  c_done_on: string | null;
  c_done_by: string | null;
}

export interface NoteRow {
  id: string;
  author: string;
  body: string;
  pinned: number;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export function toCompletion(row: CompletionRow): Completion {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    doneOn: row.done_on,
    doneBy: row.done_by,
    loggedBy: row.logged_by,
    note: row.note,
    planItemId: row.plan_item_id,
    createdAt: row.created_at,
  };
}

export function toPlanItem(row: PlanItemRow): PlanItem {
  return {
    id: row.id,
    weekStart: row.week_start,
    taskId: row.task_id,
    title: row.title,
    assignee: row.assignee,
    note: row.note,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completion:
      row.c_id && row.c_done_on && row.c_done_by
        ? { id: row.c_id, doneOn: row.c_done_on, doneBy: row.c_done_by }
        : null,
  };
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    author: row.author,
    body: row.body,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
  };
}

/** D1 surfaces SQLite constraint failures as errors whose message names the constraint. */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

export interface NewCompletion {
  id: string;
  taskId: string | null;
  title: string | null;
  doneOn: string;
  doneBy: string;
  loggedBy: string;
  note: string | null;
  planItemId: string | null;
  createdAt: string;
}

/** Any row with this id, including soft-deleted ones (idempotency lookups). */
export async function getCompletion(db: D1Database, id: string): Promise<CompletionRow | null> {
  return db.prepare('SELECT * FROM completions WHERE id = ?').bind(id).first<CompletionRow>();
}

/** Non-deleted completions with `from ≤ done_on ≤ to`, newest first. */
export async function listCompletions(
  db: D1Database,
  q: { from: string; to: string; taskId?: string | undefined },
): Promise<Completion[]> {
  const where = ['deleted_at IS NULL', 'done_on >= ?', 'done_on <= ?'];
  const binds: string[] = [q.from, q.to];
  if (q.taskId !== undefined) {
    where.push('task_id = ?');
    binds.push(q.taskId);
  }
  const { results } = await db
    .prepare(
      `SELECT * FROM completions WHERE ${where.join(' AND ')}
       ORDER BY done_on DESC, created_at DESC, id DESC`,
    )
    .bind(...binds)
    .all<CompletionRow>();
  return results.map(toCompletion);
}

/** Latest non-deleted completion per catalog task, no date limit. */
export async function latestCompletions(db: D1Database): Promise<Completion[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM (
         SELECT c.*, ROW_NUMBER() OVER (
           PARTITION BY task_id ORDER BY done_on DESC, created_at DESC, id DESC
         ) AS rn
         FROM completions c
         WHERE deleted_at IS NULL AND task_id IS NOT NULL
       ) WHERE rn = 1
       ORDER BY done_on DESC, task_id`,
    )
    .all<CompletionRow>();
  return results.map(toCompletion);
}

/**
 * Inserts a completion and, when linked, marks the plan item `done` in the same batch.
 * The link is nulled by the INSERT itself if the plan item vanished in the meantime.
 */
export async function insertCompletion(db: D1Database, c: NewCompletion): Promise<void> {
  const insert = db
    .prepare(
      `INSERT INTO completions
         (id, task_id, title, done_on, done_by, logged_by, note, plan_item_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT id FROM plan_items WHERE id = ?), ?)`,
    )
    .bind(
      c.id,
      c.taskId,
      c.title,
      c.doneOn,
      c.doneBy,
      c.loggedBy,
      c.note,
      c.planItemId,
      c.createdAt,
    );
  if (!c.planItemId) {
    await insert.run();
    return;
  }
  await db.batch([
    insert,
    db
      .prepare(`UPDATE plan_items SET status = 'done', updated_at = ? WHERE id = ?`)
      .bind(c.createdAt, c.planItemId),
  ]);
}

/**
 * Soft-deletes a completion and reverts its linked plan item to `planned`
 * unless another live completion still links it.
 */
export async function softDeleteCompletion(
  db: D1Database,
  row: CompletionRow,
  deletedBy: string,
  now: string,
): Promise<void> {
  const del = db
    .prepare(
      'UPDATE completions SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
    )
    .bind(now, deletedBy, row.id);
  if (!row.plan_item_id) {
    await del.run();
    return;
  }
  await db.batch([
    del,
    db
      .prepare(
        `UPDATE plan_items SET status = 'planned', updated_at = ?
         WHERE id = ? AND status = 'done'
           AND NOT EXISTS (
             SELECT 1 FROM completions
             WHERE plan_item_id = plan_items.id AND deleted_at IS NULL
           )`,
      )
      .bind(now, row.plan_item_id),
  ]);
}

// ---------------------------------------------------------------------------
// Plan items
// ---------------------------------------------------------------------------

const PLAN_ITEM_SELECT = `
  SELECT p.*, c.id AS c_id, c.done_on AS c_done_on, c.done_by AS c_done_by
  FROM plan_items p
  LEFT JOIN completions c ON c.id = (
    SELECT id FROM completions
    WHERE plan_item_id = p.id AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  )`;

export async function getPlanItem(db: D1Database, id: string): Promise<PlanItemRow | null> {
  return db.prepare(`${PLAN_ITEM_SELECT} WHERE p.id = ?`).bind(id).first<PlanItemRow>();
}

export async function listPlanItems(db: D1Database, weekStart: string): Promise<PlanItem[]> {
  const { results } = await db
    .prepare(`${PLAN_ITEM_SELECT} WHERE p.week_start = ? ORDER BY p.created_at, p.id`)
    .bind(weekStart)
    .all<PlanItemRow>();
  return results.map(toPlanItem);
}

/** The plan item (any status) for a catalog task in a week — at most one by unique index. */
export async function findPlanItemForTask(
  db: D1Database,
  weekStart: string,
  taskId: string,
): Promise<PlanItemRow | null> {
  return db
    .prepare(`${PLAN_ITEM_SELECT} WHERE p.week_start = ? AND p.task_id = ?`)
    .bind(weekStart, taskId)
    .first<PlanItemRow>();
}

export interface NewPlanItem {
  id: string;
  weekStart: string;
  taskId: string | null;
  title: string | null;
  assignee: string | null;
  note: string | null;
  createdBy: string;
  now: string;
}

export async function insertPlanItem(db: D1Database, p: NewPlanItem): Promise<void> {
  await db
    .prepare(
      `INSERT INTO plan_items
         (id, week_start, task_id, title, assignee, note, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?)`,
    )
    .bind(p.id, p.weekStart, p.taskId, p.title, p.assignee, p.note, p.createdBy, p.now, p.now)
    .run();
}

export interface PlanItemPatch {
  assignee?: string | null | undefined;
  note?: string | null | undefined;
  status?: 'planned' | 'skipped' | undefined;
}

/** Applies a patch unless the item became `done` meanwhile; returns whether a row changed. */
export async function updatePlanItem(
  db: D1Database,
  id: string,
  patch: PlanItemPatch,
  now: string,
): Promise<boolean> {
  const sets: string[] = [];
  const binds: (string | null)[] = [];
  if (patch.assignee !== undefined) {
    sets.push('assignee = ?');
    binds.push(patch.assignee);
  }
  if (patch.note !== undefined) {
    sets.push('note = ?');
    binds.push(patch.note);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    binds.push(patch.status);
  }
  sets.push('updated_at = ?');
  binds.push(now);
  const res = await db
    .prepare(`UPDATE plan_items SET ${sets.join(', ')} WHERE id = ? AND status != 'done'`)
    .bind(...binds, id)
    .run();
  return res.meta.changes > 0;
}

/** Hard-deletes a plan item unless it is `done`; returns whether a row was deleted. */
export async function deletePlanItem(db: D1Database, id: string): Promise<boolean> {
  const res = await db
    .prepare(`DELETE FROM plan_items WHERE id = ? AND status != 'done'`)
    .bind(id)
    .run();
  return res.meta.changes > 0;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function getNote(db: D1Database, id: string): Promise<NoteRow | null> {
  return db.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first<NoteRow>();
}

/** Non-deleted notes, pinned first, then newest first. */
export async function listNotes(db: D1Database): Promise<Note[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM notes WHERE deleted_at IS NULL
       ORDER BY pinned DESC, created_at DESC, id DESC`,
    )
    .all<NoteRow>();
  return results.map(toNote);
}

export async function insertNote(
  db: D1Database,
  n: { id: string; author: string; body: string; pinned: boolean; createdAt: string },
): Promise<void> {
  await db
    .prepare('INSERT INTO notes (id, author, body, pinned, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(n.id, n.author, n.body, n.pinned ? 1 : 0, n.createdAt)
    .run();
}

export async function softDeleteNote(
  db: D1Database,
  id: string,
  deletedBy: string,
  now: string,
): Promise<void> {
  await db
    .prepare('UPDATE notes SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL')
    .bind(now, deletedBy, id)
    .run();
}
