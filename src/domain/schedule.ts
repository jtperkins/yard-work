/**
 * Scheduling rules (plan §5 + §14.9). Pure: "today" is always passed in as a CR calendar date
 * (`todayCR(now)` at the edge), never read from the clock.
 *
 *  - Season is decided by `house.rainyMonths`; a task's cadence can differ per season.
 *  - `nextDue = lastDone + effectiveFrequency(task, lastDone)` — season evaluated at lastDone.
 *  - Never done & active → `never`, due today (sorted with overdue).
 *  - Today outside `activeMonths` → `dormant`, never counted as due. When a dormant period sits
 *    between the raw due date and today (or the raw due date lands in a dormant month), the task
 *    is due on the first day of the next active period instead.
 *  - `overdue`: daysUntilDue < 0. `due-soon`: due within 3 days (capped at frequency − 1 so a
 *    task just signed off is never immediately "due soon"; a daily task is due-soon on the day
 *    it is due).
 */
import type { House, Season, Task, TaskId } from '../shared/catalog-schema';
import {
  addDays,
  addMonths,
  diffDays,
  maxISODate,
  monthOf,
  parseYearMonth,
  yearMonthOf,
  type ISODate,
} from '../shared/dates';
import type { CompletionLike } from './types';

/** A task is "due soon" when due within this many days. */
export const DUE_SOON_DAYS = 3;

export const TASK_STATES = ['overdue', 'never', 'due-soon', 'ok', 'dormant'] as const;
export type TaskState = (typeof TASK_STATES)[number];

export interface TaskStatus {
  taskId: TaskId;
  state: TaskState;
  /** most recent sign-off date (on or before today) */
  lastDone?: ISODate;
  /** who did the most recent sign-off, when known */
  lastDoneBy?: string;
  /** next due date (today for `never`; the first active day for dormant tasks) */
  nextDue?: ISODate;
  /** diffDays(today, nextDue): negative = overdue by that many days */
  daysUntilDue?: number;
  /** cadence in effect today (season-aware) */
  frequencyDays: number;
}

type SeasonHouse = Pick<House, 'rainyMonths'>;
type FrequencyTask = Pick<Task, 'frequencyDays' | 'frequencyDaysBySeason'>;
type ActiveTask = Pick<Task, 'activeMonths'>;
type ScheduleTask = Pick<Task, 'id' | 'frequencyDays' | 'frequencyDaysBySeason' | 'activeMonths'>;

// ---------------------------------------------------------------------------
// Season & cadence
// ---------------------------------------------------------------------------

export function seasonFor(date: ISODate, house: SeasonHouse): Season {
  return house.rainyMonths.includes(monthOf(date)) ? 'rainy' : 'dry';
}

/** Cadence (days) that applies on `date`: the season override if any, else `frequencyDays`. */
export function effectiveFrequency(task: FrequencyTask, date: ISODate, house: SeasonHouse): number {
  return task.frequencyDaysBySeason?.[seasonFor(date, house)] ?? task.frequencyDays;
}

// ---------------------------------------------------------------------------
// Active months
// ---------------------------------------------------------------------------

/** The set of active months, or null when the task runs all year. */
function activeMonthSet(task: ActiveTask): ReadonlySet<number> | null {
  const months = task.activeMonths;
  if (!months || months.length === 0 || new Set(months).size >= 12) return null;
  return new Set(months);
}

/** True unless the task has `activeMonths` and `date`'s month is not one of them. */
export function isActive(task: ActiveTask, date: ISODate): boolean {
  const months = activeMonthSet(task);
  return months === null || months.has(monthOf(date));
}

/** `date` itself if active, else the 1st of the next active month. */
export function firstActiveOnOrAfter(task: ActiveTask, date: ISODate): ISODate {
  const months = activeMonthSet(task);
  if (months === null || months.has(monthOf(date))) return date;
  const ym = yearMonthOf(date);
  for (let i = 1; i <= 12; i++) {
    const next = addMonths(ym, i);
    if (months.has(parseYearMonth(next).month)) return `${next}-01`;
  }
  // Unreachable: a non-null set always contains some month.
  return date;
}

/**
 * First day of the contiguous active period containing `date` (which must be active), or null
 * when the task is active all year.
 */
export function activePeriodStart(task: ActiveTask, date: ISODate): ISODate | null {
  const months = activeMonthSet(task);
  if (months === null) return null;
  const ym = yearMonthOf(date);
  for (let i = 1; i < 12; i++) {
    const prev = addMonths(ym, -i);
    if (!months.has(parseYearMonth(prev).month)) return `${addMonths(ym, -i + 1)}-01`;
  }
  // Unreachable: a non-null set is missing at least one month.
  return null;
}

// ---------------------------------------------------------------------------
// Due dates & status
// ---------------------------------------------------------------------------

/**
 * Next due date as seen on `today`, applying the dormant-period rules. Never done → due today
 * (or on the first active day if the task is dormant today).
 */
export function nextDueDate(
  task: Omit<ScheduleTask, 'id'>,
  lastDone: ISODate | undefined,
  today: ISODate,
  house: SeasonHouse,
): ISODate {
  if (lastDone === undefined) return firstActiveOnOrAfter(task, today);
  const raw = addDays(lastDone, effectiveFrequency(task, lastDone, house));
  if (raw > today) return firstActiveOnOrAfter(task, raw);
  if (!isActive(task, today)) return firstActiveOnOrAfter(task, today);
  const periodStart = activePeriodStart(task, today);
  return periodStart !== null && raw < periodStart ? periodStart : raw;
}

/** Latest completion per catalog task, ignoring ad-hoc rows and sign-offs dated after `today`. */
export function latestByTask<C extends CompletionLike>(
  completions: readonly C[],
  today?: ISODate,
): Map<TaskId, C> {
  const latest = new Map<TaskId, C>();
  for (const c of completions) {
    if (c.taskId === null) continue;
    if (today !== undefined && c.doneOn > today) continue;
    const current = latest.get(c.taskId);
    if (current === undefined || c.doneOn > current.doneOn) latest.set(c.taskId, c);
  }
  return latest;
}

function dueSoonWindow(frequency: number): number {
  return Math.max(0, Math.min(DUE_SOON_DAYS, frequency - 1));
}

/** Status from an already-known latest completion (shared by taskStatus / taskStatuses). */
export function statusFromLatest(
  task: ScheduleTask,
  latest: CompletionLike | undefined,
  today: ISODate,
  house: SeasonHouse,
): TaskStatus {
  const lastDone = latest?.doneOn;
  const nextDue = nextDueDate(task, lastDone, today, house);
  const daysUntilDue = diffDays(today, nextDue);
  const status: TaskStatus = {
    taskId: task.id,
    state: 'ok',
    nextDue,
    daysUntilDue,
    frequencyDays: effectiveFrequency(task, today, house),
  };
  if (lastDone !== undefined) status.lastDone = lastDone;
  if (latest?.doneBy !== undefined) status.lastDoneBy = latest.doneBy;

  if (!isActive(task, today)) status.state = 'dormant';
  else if (lastDone === undefined) status.state = 'never';
  else if (daysUntilDue < 0) status.state = 'overdue';
  else if (daysUntilDue <= dueSoonWindow(effectiveFrequency(task, lastDone, house)))
    status.state = 'due-soon';
  return status;
}

/** Status of one task given (any) completions; only that task's rows are considered. */
export function taskStatus(
  task: ScheduleTask,
  completions: readonly CompletionLike[],
  today: ISODate,
  house: SeasonHouse,
): TaskStatus {
  const own = completions.filter((c) => c.taskId === task.id);
  return statusFromLatest(task, latestByTask(own, today).get(task.id), today, house);
}

/** Statuses for many tasks in one pass over the completions. */
export function taskStatuses(
  tasks: readonly ScheduleTask[],
  completions: readonly CompletionLike[],
  today: ISODate,
  house: SeasonHouse,
): Map<TaskId, TaskStatus> {
  const latest = latestByTask(completions, today);
  return new Map(tasks.map((t) => [t.id, statusFromLatest(t, latest.get(t.id), today, house)]));
}

/** Sort rank: overdue & never first, then due-soon, ok, dormant. */
export function urgencyRank(state: TaskState): number {
  switch (state) {
    case 'overdue':
    case 'never':
      return 0;
    case 'due-soon':
      return 1;
    case 'ok':
      return 2;
    case 'dormant':
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

/** % on track = active tasks not overdue/never ÷ active tasks (100 when nothing is active). */
export function percentOnTrack(statuses: Iterable<Pick<TaskStatus, 'state'>>): number {
  let active = 0;
  let onTrack = 0;
  for (const s of statuses) {
    if (s.state === 'dormant') continue;
    active++;
    if (s.state === 'ok' || s.state === 'due-soon') onTrack++;
  }
  return active === 0 ? 100 : Math.round((onTrack / active) * 100);
}

// ---------------------------------------------------------------------------
// Calendar projection
// ---------------------------------------------------------------------------

/** Safety cap for projection loops (≈ 10 years of a daily task). */
const MAX_PROJECTION_STEPS = 3700;

/**
 * Projected due dates within [rangeStart, rangeEnd] (inclusive) for the calendar, assuming the
 * task is done on each due date. Projections never fall before `today`: an overdue or never-done
 * task is projected from today. Dormant months are skipped (resuming on the first active day),
 * and each step uses the cadence of the season it starts in.
 */
export function projectDueDates(
  task: Omit<ScheduleTask, 'id'>,
  lastDone: ISODate | undefined,
  rangeStart: ISODate,
  rangeEnd: ISODate,
  house: SeasonHouse,
  today: ISODate,
): ISODate[] {
  const out: ISODate[] = [];
  if (rangeEnd < rangeStart || rangeEnd < today) return out;
  let cursor = maxISODate(nextDueDate(task, lastDone, today, house), today);
  for (let step = 0; cursor <= rangeEnd && step < MAX_PROJECTION_STEPS; step++) {
    if (!isActive(task, cursor)) {
      cursor = firstActiveOnOrAfter(task, cursor);
      continue;
    }
    if (cursor >= rangeStart) out.push(cursor);
    cursor = addDays(cursor, effectiveFrequency(task, cursor, house));
  }
  return out;
}
