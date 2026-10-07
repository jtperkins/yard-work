/**
 * Insights statistics (plan §5 + §14.9): activity heatmap counts, on-time rate per category and
 * completions per person per week. Pure; ranges and "today" are passed in.
 */
import {
  CATEGORIES,
  type Category,
  type House,
  type Task,
  type TaskId,
} from '../shared/catalog-schema';
import type { Completion } from '../shared/api-schemas';
import { addDays, diffDays, eachDay, isWithin, weekStart, type ISODate } from '../shared/dates';
import { effectiveFrequency, nextDueDate } from './schedule';
import type { CompletionLike, PersonCompletion } from './types';

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

export interface DailyCount {
  date: ISODate;
  count: number;
}

/** One entry per day in [from, to] (inclusive, zero-filled), counting every completion. */
export function dailyCounts(
  completions: readonly Pick<Completion, 'doneOn'>[],
  from: ISODate,
  to: ISODate,
): DailyCount[] {
  const counts = new Map<ISODate, number>();
  for (const c of completions) {
    if (isWithin(c.doneOn, from, to)) counts.set(c.doneOn, (counts.get(c.doneOn) ?? 0) + 1);
  }
  return eachDay(from, to).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

// ---------------------------------------------------------------------------
// On-time rate
// ---------------------------------------------------------------------------

/** A repeat sign-off is on time if done within the cadence plus this fraction of it. */
export const ON_TIME_GRACE = 0.2;

export interface CategoryOnTime {
  category: Category;
  /** repeat sign-offs that were on time */
  onTime: number;
  /** repeat sign-offs measured (every sign-off after a task's first) */
  total: number;
  /** onTime / total in [0, 1], or null when nothing was measured */
  rate: number | null;
}

/**
 * For each catalog task, every sign-off after its first is compared with the previous one: on
 * time if it lands no later than the due date (same dormant-period rules as the board, season
 * evaluated at the previous sign-off) plus 20% of the cadence — i.e. gap ≤ frequency × 1.2 for
 * year-round tasks. Same-day duplicates count once. Results cover every category, in
 * `CATEGORIES` order.
 */
export function onTimeRateByCategory(
  tasks: readonly Task[],
  completions: readonly CompletionLike[],
  house: Pick<House, 'rainyMonths'>,
): CategoryOnTime[] {
  const datesByTask = new Map<TaskId, Set<ISODate>>();
  for (const c of completions) {
    if (c.taskId === null) continue;
    const set = datesByTask.get(c.taskId) ?? new Set<ISODate>();
    set.add(c.doneOn);
    datesByTask.set(c.taskId, set);
  }

  const tally = new Map<Category, { onTime: number; total: number }>(
    CATEGORIES.map((cat) => [cat, { onTime: 0, total: 0 }]),
  );
  for (const task of tasks) {
    const dates = [...(datesByTask.get(task.id) ?? [])].sort();
    const entry = tally.get(task.category);
    if (!entry) continue;
    for (let i = 1; i < dates.length; i++) {
      const prev = dates[i - 1] as ISODate;
      const cur = dates[i] as ISODate;
      const frequency = effectiveFrequency(task, prev, house);
      const grace = Math.floor(frequency * ON_TIME_GRACE + 1e-9);
      const deadline = addDays(nextDueDate(task, prev, cur, house), grace);
      entry.total++;
      if (cur <= deadline) entry.onTime++;
    }
  }

  return CATEGORIES.map((category) => {
    const { onTime, total } = tally.get(category) ?? { onTime: 0, total: 0 };
    return { category, onTime, total, rate: total === 0 ? null : onTime / total };
  });
}

// ---------------------------------------------------------------------------
// By person per week
// ---------------------------------------------------------------------------

export interface PersonWeek {
  /** Monday */
  weekStart: ISODate;
  /** completions per person (keys are the `people` labels; missing = 0) */
  counts: Record<string, number>;
  total: number;
}

export interface PersonWeekly {
  /** people with at least one completion in the window, most completions first */
  people: string[];
  /** oldest week first; the last entry is the week containing `today` */
  weeks: PersonWeek[];
}

/**
 * Completions per person for the last `weeks` Monday-first weeks ending with the week that
 * contains `today`. Names are trimmed and grouped case-insensitively; the first spelling seen
 * (in date order) is used as the label.
 */
export function byPersonWeekly(
  completions: readonly PersonCompletion[],
  weeks: number,
  today: ISODate,
): PersonWeekly {
  const count = Math.max(0, Math.floor(weeks));
  const lastMonday = weekStart(today);
  const firstMonday = addDays(lastMonday, -7 * (count - 1));
  const windowEnd = addDays(lastMonday, 6);
  const rows: PersonWeek[] = Array.from({ length: count }, (_, i) => ({
    weekStart: addDays(firstMonday, 7 * i),
    counts: {},
    total: 0,
  }));
  if (count === 0) return { people: [], weeks: rows };

  const labels = new Map<string, string>();
  const totals = new Map<string, number>();
  const sorted = [...completions].sort((a, b) =>
    a.doneOn < b.doneOn ? -1 : a.doneOn > b.doneOn ? 1 : 0,
  );
  for (const c of sorted) {
    if (!isWithin(c.doneOn, firstMonday, windowEnd)) continue;
    const name = c.doneBy.trim();
    if (name === '') continue;
    const key = name.toLocaleLowerCase();
    const label = labels.get(key) ?? name;
    labels.set(key, label);
    const index = diffDays(firstMonday, weekStart(c.doneOn)) / 7;
    const row = rows[index];
    if (!row) continue;
    row.counts[label] = (row.counts[label] ?? 0) + 1;
    row.total++;
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }

  const people = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label);
  return { people, weeks: rows };
}
