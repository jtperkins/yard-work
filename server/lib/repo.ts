/**
 * SQL access for D1. Maps snake_case rows to the camelCase DTOs in src/shared/api-schemas.ts.
 * Multi-statement writes use `db.batch` (one implicit transaction, statements run in order).
 */
import type {
  Completion,
  Incident,
  IncidentFile,
  IncidentType,
  IntervalUnit,
  Note,
  Priority,
  Task,
  TaskKind,
} from '../../src/shared/api-schemas';

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
  partial: number;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface TaskRow {
  id: string;
  title: string;
  title_es: string | null;
  steps: string;
  steps_es: string | null;
  safety: string | null;
  kind: TaskKind;
  interval_count: number | null;
  interval_unit: IntervalUnit | null;
  due_on: string | null;
  priority: Priority;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentRow {
  id: string;
  occurred_at: string;
  type: IncidentType;
  location: string | null;
  description: string;
  people: string | null;
  reported_by: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface IncidentFileRow {
  id: string;
  incident_id: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
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
    partial: row.partial === 1,
    createdAt: row.created_at,
  };
}

function splitSteps(value: string | null): string[] {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** Steps are stored one per line; an empty Spanish list is stored as NULL. */
function joinSteps(steps: string[] | null): string | null {
  return steps && steps.length > 0 ? steps.join('\n') : null;
}

export function toTask(row: TaskRow): Task {
  const stepsEs = splitSteps(row.steps_es);
  return {
    id: row.id,
    title: row.title,
    titleEs: row.title_es,
    steps: splitSteps(row.steps),
    stepsEs: stepsEs.length > 0 ? stepsEs : null,
    safety: row.safety,
    kind: row.kind,
    intervalCount: row.interval_count,
    intervalUnit: row.interval_unit,
    dueOn: row.due_on,
    priority: row.priority,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    type: row.type,
    location: row.location,
    description: row.description,
    people: row.people,
    reportedBy: row.reported_by,
    createdAt: row.created_at,
  };
}

export function toIncidentFile(row: IncidentFileRow): IncidentFile {
  return {
    id: row.id,
    incidentId: row.incident_id,
    fileName: row.file_name,
    contentType: row.content_type,
    size: row.size,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
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
  partial: boolean;
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

/**
 * Per task, the newest full sign-off and the newest partial one (at most two rows each), so a
 * partial never hides the last full sign-off. The domain decides whether the partial counts.
 */
export async function latestCompletions(db: D1Database): Promise<Completion[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM (
         SELECT c.*, ROW_NUMBER() OVER (
           PARTITION BY task_id, partial ORDER BY done_on DESC, created_at DESC, id DESC
         ) AS rn
         FROM completions c
         WHERE deleted_at IS NULL AND task_id IS NOT NULL
       ) WHERE rn = 1
       ORDER BY done_on DESC, task_id`,
    )
    .all<CompletionRow>();
  return results.map(toCompletion);
}

export async function insertCompletion(db: D1Database, c: NewCompletion): Promise<void> {
  await db
    .prepare(
      `INSERT INTO completions
         (id, task_id, title, done_on, done_by, logged_by, note, plan_item_id, partial, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
    .bind(
      c.id,
      c.taskId,
      c.title,
      c.doneOn,
      c.doneBy,
      c.loggedBy,
      c.note,
      c.partial ? 1 : 0,
      c.createdAt,
    )
    .run();
}

export async function softDeleteCompletion(
  db: D1Database,
  row: CompletionRow,
  deletedBy: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE completions SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
    )
    .bind(now, deletedBy, row.id)
    .run();
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function getTask(db: D1Database, id: string): Promise<TaskRow | null> {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<TaskRow>();
}

/** Active tasks by title, or every task (archived too) when `includeArchived`. */
export async function listTasks(db: D1Database, includeArchived: boolean): Promise<Task[]> {
  const where = includeArchived ? '' : 'WHERE archived_at IS NULL';
  const { results } = await db
    .prepare(`SELECT * FROM tasks ${where} ORDER BY title COLLATE NOCASE, id`)
    .all<TaskRow>();
  return results.map(toTask);
}

export async function taskIdExists(db: D1Database, id: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS ok FROM tasks WHERE id = ?').bind(id).first();
  return row !== null;
}

export interface TaskWrite {
  title: string;
  titleEs: string | null;
  steps: string[];
  stepsEs: string[] | null;
  safety: string | null;
  kind: TaskKind;
  intervalCount: number | null;
  intervalUnit: IntervalUnit | null;
  dueOn: string | null;
  priority: Priority;
}

export async function insertTask(
  db: D1Database,
  id: string,
  t: TaskWrite,
  createdBy: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tasks
         (id, title, title_es, steps, steps_es, safety, kind, interval_count, interval_unit,
          due_on, priority, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      t.title,
      t.titleEs,
      t.steps.join('\n'),
      joinSteps(t.stepsEs),
      t.safety,
      t.kind,
      t.intervalCount,
      t.intervalUnit,
      t.dueOn,
      t.priority,
      createdBy,
      now,
      now,
    )
    .run();
}

export async function updateTask(
  db: D1Database,
  id: string,
  t: TaskWrite,
  archivedAt: string | null,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE tasks SET title = ?, title_es = ?, steps = ?, steps_es = ?, safety = ?, kind = ?,
         interval_count = ?, interval_unit = ?, due_on = ?, priority = ?, archived_at = ?,
         updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      t.title,
      t.titleEs,
      t.steps.join('\n'),
      joinSteps(t.stepsEs),
      t.safety,
      t.kind,
      t.intervalCount,
      t.intervalUnit,
      t.dueOn,
      t.priority,
      archivedAt,
      now,
      id,
    )
    .run();
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export async function getIncident(db: D1Database, id: string): Promise<IncidentRow | null> {
  return db.prepare('SELECT * FROM incidents WHERE id = ?').bind(id).first<IncidentRow>();
}

/** Non-deleted incidents, newest `occurred_at` first, with their file counts. */
export async function listIncidents(db: D1Database): Promise<(Incident & { fileCount: number })[]> {
  const { results } = await db
    .prepare(
      `SELECT i.*, (SELECT COUNT(*) FROM incident_files f WHERE f.incident_id = i.id) AS file_count
       FROM incidents i WHERE i.deleted_at IS NULL
       ORDER BY i.occurred_at DESC, i.id DESC`,
    )
    .all<IncidentRow & { file_count: number }>();
  return results.map((row) => ({ ...toIncident(row), fileCount: row.file_count }));
}

export async function insertIncident(
  db: D1Database,
  i: Incident & { location: string | null; people: string | null },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO incidents
         (id, occurred_at, type, location, description, people, reported_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      i.id,
      i.occurredAt,
      i.type,
      i.location,
      i.description,
      i.people,
      i.reportedBy,
      i.createdAt,
    )
    .run();
}

export async function softDeleteIncident(
  db: D1Database,
  id: string,
  deletedBy: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE incidents SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
    )
    .bind(now, deletedBy, id)
    .run();
}

export async function listIncidentFiles(
  db: D1Database,
  incidentId: string,
): Promise<IncidentFileRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM incident_files WHERE incident_id = ? ORDER BY created_at, id')
    .bind(incidentId)
    .all<IncidentFileRow>();
  return results;
}

export async function countIncidentFiles(db: D1Database, incidentId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM incident_files WHERE incident_id = ?')
    .bind(incidentId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getIncidentFile(db: D1Database, id: string): Promise<IncidentFileRow | null> {
  return db.prepare('SELECT * FROM incident_files WHERE id = ?').bind(id).first<IncidentFileRow>();
}

export async function insertIncidentFile(db: D1Database, f: IncidentFileRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO incident_files
         (id, incident_id, r2_key, file_name, content_type, size, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      f.id,
      f.incident_id,
      f.r2_key,
      f.file_name,
      f.content_type,
      f.size,
      f.uploaded_by,
      f.created_at,
    )
    .run();
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
