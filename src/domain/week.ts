/**
 * Weekly plan suggestions (plan §5): catalog tasks that are due on or before the end of the week,
 * can actually be done that week (active months), and are not already on that week's plan.
 *
 * When planning ahead, items still `planned` in an earlier week (from the current week on) count
 * as if done on that week's yard day, so a job already planned this week is only suggested again
 * next week when its cadence brings it back.
 */
import type { House, Priority, Task, TaskId, Who } from '../shared/catalog-schema';
import {
  addDays,
  eachDay,
  maxISODate,
  minISODate,
  weekStart as mondayOf,
  type ISODate,
} from '../shared/dates';
import {
  effectiveFrequency,
  isActive,
  latestByTask,
  statusFromLatest,
  urgencyRank,
  type TaskStatus,
} from './schedule';
import type { CompletionLike, PlanItemLike } from './types';

export interface WeekSuggestion {
  task: Task;
  status: TaskStatus;
  /** date the task is (or was) due; for overdue/never tasks this is on or before today */
  dueOn: ISODate;
  /** typical performer, carried through from the catalog */
  who: Who;
}

export interface SuggestOptions {
  /**
   * Include daily tasks (cadence of 1 day, e.g. cat care). Off by default: they belong on the
   * Board's "Today" strip, not on a weekly plan, and would otherwise be suggested every week.
   */
  includeDaily?: boolean;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/** Overdue/never first, then priority (high → low), then due date, then id (stable). */
function compareSuggestions(a: WeekSuggestion, b: WeekSuggestion): number {
  const groupA = urgencyRank(a.status.state) === 0 ? 0 : 1;
  const groupB = urgencyRank(b.status.state) === 0 ? 0 : 1;
  if (groupA !== groupB) return groupA - groupB;
  const priority = PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority];
  if (priority !== 0) return priority;
  if (a.dueOn !== b.dueOn) return a.dueOn < b.dueOn ? -1 : 1;
  return a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0;
}

export type SuggestHouse = Pick<House, 'rainyMonths'> & Partial<Pick<House, 'yardDay'>>;

/**
 * The date a still-`planned` item in week `monday` is expected to be done: that week's yard day
 * (Monday when unknown), but never before today nor after the week's Sunday.
 */
export function projectedDoneOn(monday: ISODate, today: ISODate, yardDay?: number): ISODate {
  const target = addDays(monday, (yardDay ?? 1) - 1);
  return minISODate(maxISODate(target, today), addDays(monday, 6));
}

/**
 * Latest projected done date per task from items still `planned` in weeks after today's week
 * began and before `start` (stale items from past weeks are ignored: that work is simply late).
 */
function projectedFromEarlierWeeks(
  planItems: readonly PlanItemLike[],
  start: ISODate,
  today: ISODate,
  yardDay: number | undefined,
): Map<TaskId, ISODate> {
  const thisMonday = mondayOf(today);
  const projected = new Map<TaskId, ISODate>();
  for (const item of planItems) {
    if (item.taskId === null || item.status !== 'planned') continue;
    if (item.weekStart >= start || item.weekStart < thisMonday) continue;
    const on = projectedDoneOn(item.weekStart, today, yardDay);
    const current = projected.get(item.taskId);
    if (current === undefined || on > current) projected.set(item.taskId, on);
  }
  return projected;
}

/**
 * Status as if the task were done on `plannedOn` (its earlier week's projected day): the due date
 * and state follow from that, while last-done stays the real sign-off.
 */
function projectedStatus(
  task: Task,
  plannedOn: ISODate,
  actual: TaskStatus,
  today: ISODate,
  house: SuggestHouse,
): TaskStatus {
  const {
    lastDone: _lastDone,
    lastDoneBy: _lastDoneBy,
    ...projected
  } = statusFromLatest(task, { taskId: task.id, doneOn: plannedOn }, today, house);
  const status: TaskStatus = projected;
  if (actual.lastDone !== undefined) status.lastDone = actual.lastDone;
  if (actual.lastDoneBy !== undefined) status.lastDoneBy = actual.lastDoneBy;
  return status;
}

/**
 * Suggestions for the week starting `weekStartDate` (normalised to its Monday), evaluated as of
 * `today`. Any plan item for a task in that week (planned, done or skipped) suppresses it. Items
 * from earlier weeks may be passed too: one still `planned` (from today's week on) moves the
 * task's due date to a cadence after that week's yard day.
 */
export function suggestForWeek(
  tasks: readonly Task[],
  completions: readonly CompletionLike[],
  planItems: readonly PlanItemLike[],
  weekStartDate: ISODate,
  house: SuggestHouse,
  today: ISODate,
  options: SuggestOptions = {},
): WeekSuggestion[] {
  const start = mondayOf(weekStartDate);
  const end = addDays(start, 6);
  const planned = new Set<TaskId>();
  for (const item of planItems) {
    if (item.weekStart === start && item.taskId !== null) planned.add(item.taskId);
  }
  const projected = projectedFromEarlierWeeks(planItems, start, today, house.yardDay);
  const latest = latestByTask(completions, today);
  const reference = maxISODate(today, start);

  const out: WeekSuggestion[] = [];
  for (const task of tasks) {
    if (planned.has(task.id)) continue;
    if (!options.includeDaily && effectiveFrequency(task, reference, house) <= 1) continue;
    const last = latest.get(task.id);
    const actual = statusFromLatest(task, last, today, house);
    const plannedOn = projected.get(task.id);
    const status =
      plannedOn !== undefined && (last === undefined || plannedOn > last.doneOn)
        ? projectedStatus(task, plannedOn, actual, today, house)
        : actual;
    const dueOn = status.nextDue ?? today;
    if (dueOn > end) continue;
    // Must be doable this week on/after it falls due (skips weeks that are entirely dormant).
    const doableFrom = maxISODate(dueOn, start);
    if (!eachDay(doableFrom, end).some((d) => isActive(task, d))) continue;
    out.push({ task, status, dueOn, who: task.who });
  }
  return out.sort(compareSuggestions);
}
