/**
 * Scheduling rules. Pure: "today" is always passed in as a CR calendar date (`todayCR(now)` at
 * the edge), never read from the clock.
 *
 *  - A task is recurring (every N days, weeks or months) or a one-off (optionally with a due date).
 *  - Only full sign-offs move the schedule. A partial sign-off is an overlay (`inProgress`) that
 *    shows work was started, and it never replaces the last full sign-off.
 *  - Recurring: `nextDue = lastFull + interval` (calendar months for month intervals). Never
 *    signed off fully → `never`, due today. `overdue`: daysUntilDue < 0. `due-soon`: due within 3
 *    days (capped at interval − 1 so a task just signed off is never immediately "due soon").
 *  - One-off: a full sign-off makes it `done`. Otherwise `never` without a due date, or
 *    `overdue` / `due-soon` / `ok` from its due date.
 */
import type { Task, TaskId } from '../shared/api-schemas';
import { addDays, addMonthsISO, diffDays, type ISODate } from '../shared/dates';
import type { CompletionLike } from './types';

/** A task is "due soon" when due within this many days. */
export const DUE_SOON_DAYS = 3;

export const TASK_STATES = ['overdue', 'never', 'due-soon', 'ok', 'done'] as const;
export type TaskState = (typeof TASK_STATES)[number];

export interface InProgress {
  /** date of the newest partial sign-off */
  on: ISODate;
  /** what is left, as written on the partial sign-off */
  note: string | null;
  by: string;
}

export interface TaskStatus {
  taskId: TaskId;
  state: TaskState;
  /** most recent full sign-off date (on or before today) */
  lastDone?: ISODate;
  /** who did the most recent full sign-off, when known */
  lastDoneBy?: string;
  /** next due date (today for `never`, undefined for a `done` one-off) */
  nextDue?: ISODate;
  /** diffDays(today, nextDue): negative = overdue by that many days */
  daysUntilDue?: number;
  /** interval in days (month = 30), null for a one-off */
  frequencyDays: number | null;
  /** newer partial sign-off than the last full one (never set on a `done` task) */
  inProgress?: InProgress;
}

type ScheduleTask = Pick<Task, 'id' | 'kind' | 'intervalCount' | 'intervalUnit' | 'dueOn'>;
type IntervalTask = Pick<Task, 'kind' | 'intervalCount' | 'intervalUnit'>;

// ---------------------------------------------------------------------------
// Intervals
// ---------------------------------------------------------------------------

const DAYS_PER_UNIT = { day: 1, week: 7, month: 30 } as const;

/**
 * Effective day count of a recurring task (a month counts as 30). Only for the due-soon window,
 * daily detection and display. Due dates use `addInterval` (calendar months). Null for one-offs.
 */
export function intervalDays(task: IntervalTask): number | null {
  if (task.kind !== 'recurring' || task.intervalCount == null || task.intervalUnit == null) {
    return null;
  }
  return task.intervalCount * DAYS_PER_UNIT[task.intervalUnit];
}

/** A recurring task that comes round every day. */
export function isDailyTask(task: IntervalTask): boolean {
  return intervalDays(task) === 1;
}

/** `date` plus one interval of the task (calendar months, clamped to month end). */
export function addInterval(
  date: ISODate,
  task: Pick<Task, 'intervalCount' | 'intervalUnit'>,
): ISODate {
  if (task.intervalCount == null || task.intervalUnit == null) return date;
  switch (task.intervalUnit) {
    case 'day':
      return addDays(date, task.intervalCount);
    case 'week':
      return addDays(date, 7 * task.intervalCount);
    case 'month':
      return addMonthsISO(date, task.intervalCount);
  }
}

function dueSoonWindow(task: IntervalTask): number {
  const days = intervalDays(task);
  return days === null ? DUE_SOON_DAYS : Math.max(0, Math.min(DUE_SOON_DAYS, days - 1));
}

// ---------------------------------------------------------------------------
// Latest sign-offs
// ---------------------------------------------------------------------------

function isFull(c: CompletionLike): boolean {
  return c.partial !== true;
}

/** `a` is newer than `b` by date, then by `createdAt` when both have it. */
function isNewer(a: CompletionLike, b: CompletionLike): boolean {
  if (a.doneOn !== b.doneOn) return a.doneOn > b.doneOn;
  return a.createdAt !== undefined && b.createdAt !== undefined && a.createdAt > b.createdAt;
}

/** Latest full completion per catalog task, ignoring ad-hoc rows and sign-offs dated after `today`. */
export function latestByTask<C extends CompletionLike>(
  completions: readonly C[],
  today?: ISODate,
): Map<TaskId, C> {
  const latest = new Map<TaskId, C>();
  for (const c of completions) {
    if (c.taskId === null || !isFull(c)) continue;
    if (today !== undefined && c.doneOn > today) continue;
    const current = latest.get(c.taskId);
    if (current === undefined || isNewer(c, current)) latest.set(c.taskId, c);
  }
  return latest;
}

/**
 * Per task, the newest partial completion that is strictly newer than that task's latest full
 * sign-off (or the newest partial when there is no full one).
 */
export function latestPartialByTask<C extends CompletionLike>(
  completions: readonly C[],
  today: ISODate,
  latestFull: ReadonlyMap<TaskId, CompletionLike>,
): Map<TaskId, C> {
  const partials = new Map<TaskId, C>();
  for (const c of completions) {
    if (c.taskId === null || isFull(c) || c.doneOn > today) continue;
    const current = partials.get(c.taskId);
    if (current === undefined || isNewer(c, current)) partials.set(c.taskId, c);
  }
  for (const [taskId, partial] of partials) {
    const full = latestFull.get(taskId);
    if (full !== undefined && !isNewer(partial, full)) partials.delete(taskId);
  }
  return partials;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

function dueState(daysUntilDue: number, window: number): TaskState {
  if (daysUntilDue < 0) return 'overdue';
  return daysUntilDue <= window ? 'due-soon' : 'ok';
}

/** Status from already-known latest completions (shared by taskStatus / taskStatuses). */
export function statusFromLatest(
  task: ScheduleTask,
  latestFull: CompletionLike | undefined,
  latestPartial: CompletionLike | undefined,
  today: ISODate,
): TaskStatus {
  const status: TaskStatus = {
    taskId: task.id,
    state: 'never',
    frequencyDays: intervalDays(task),
  };
  if (latestFull) {
    status.lastDone = latestFull.doneOn;
    if (latestFull.doneBy !== undefined) status.lastDoneBy = latestFull.doneBy;
  }

  const setDue = (due: ISODate) => {
    status.nextDue = due;
    status.daysUntilDue = diffDays(today, due);
  };

  if (task.kind === 'once') {
    if (latestFull) {
      status.state = 'done';
      return status;
    }
    if (task.dueOn) {
      setDue(task.dueOn);
      status.state = dueState(status.daysUntilDue ?? 0, DUE_SOON_DAYS);
    } else {
      setDue(today);
    }
  } else if (latestFull) {
    setDue(addInterval(latestFull.doneOn, task));
    status.state = dueState(status.daysUntilDue ?? 0, dueSoonWindow(task));
  } else {
    setDue(today);
  }

  if (latestPartial) {
    status.inProgress = {
      on: latestPartial.doneOn,
      note: latestPartial.note ?? null,
      by: latestPartial.doneBy ?? '',
    };
  }
  return status;
}

/** Status of one task given (any) completions; only that task's rows are considered. */
export function taskStatus(
  task: ScheduleTask,
  completions: readonly CompletionLike[],
  today: ISODate,
): TaskStatus {
  return taskStatuses(
    [task],
    completions.filter((c) => c.taskId === task.id),
    today,
  ).get(task.id) as TaskStatus;
}

/** Statuses for many tasks in one pass over the completions. */
export function taskStatuses(
  tasks: readonly ScheduleTask[],
  completions: readonly CompletionLike[],
  today: ISODate,
): Map<TaskId, TaskStatus> {
  const full = latestByTask(completions, today);
  const partial = latestPartialByTask(completions, today, full);
  return new Map(
    tasks.map((t) => [t.id, statusFromLatest(t, full.get(t.id), partial.get(t.id), today)]),
  );
}

/** Sort rank: overdue & never first, then due-soon, ok, done. */
export function urgencyRank(state: TaskState): number {
  switch (state) {
    case 'overdue':
    case 'never':
      return 0;
    case 'due-soon':
      return 1;
    case 'ok':
      return 2;
    case 'done':
      return 3;
  }
}

/** Comparator: most urgent first, then earliest due date. */
export function compareByUrgency(
  a: Pick<TaskStatus, 'state' | 'nextDue'>,
  b: Pick<TaskStatus, 'state' | 'nextDue'>,
): number {
  const rank = urgencyRank(a.state) - urgencyRank(b.state);
  if (rank !== 0) return rank;
  const ad = a.nextDue ?? '9999-12-31';
  const bd = b.nextDue ?? '9999-12-31';
  return ad < bd ? -1 : ad > bd ? 1 : 0;
}

/** % on track = open tasks not overdue/never ÷ open tasks (100 when nothing is open). */
export function percentOnTrack(statuses: Iterable<Pick<TaskStatus, 'state'>>): number {
  let open = 0;
  let onTrack = 0;
  for (const s of statuses) {
    if (s.state === 'done') continue;
    open++;
    if (s.state === 'ok' || s.state === 'due-soon') onTrack++;
  }
  return open === 0 ? 100 : Math.round((onTrack / open) * 100);
}
