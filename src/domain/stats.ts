/**
 * Insights statistics: activity heatmap counts and completions per person per week. Pure; ranges
 * and "today" are passed in. Partial sign-offs are work in progress, so they are never counted
 * (a missing `partial` counts as a full sign-off, for ad-hoc rows and fixtures).
 */
import type { Completion } from '../shared/api-schemas';
import { addDays, diffDays, eachDay, isWithin, weekStart, type ISODate } from '../shared/dates';
import type { PersonCompletion } from './types';

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

export interface DailyCount {
  date: ISODate;
  count: number;
}

/** One entry per day in [from, to] (inclusive, zero-filled), counting full sign-offs. */
export function dailyCounts(
  completions: readonly (Pick<Completion, 'doneOn'> & Partial<Pick<Completion, 'partial'>>)[],
  from: ISODate,
  to: ISODate,
): DailyCount[] {
  const counts = new Map<ISODate, number>();
  for (const c of completions) {
    if (c.partial !== true && isWithin(c.doneOn, from, to))
      counts.set(c.doneOn, (counts.get(c.doneOn) ?? 0) + 1);
  }
  return eachDay(from, to).map((date) => ({ date, count: counts.get(date) ?? 0 }));
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
    if (c.partial === true || !isWithin(c.doneOn, firstMonday, windowEnd)) continue;
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
