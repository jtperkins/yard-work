import type { PersonWeekly } from '../../domain/stats';
import type { Completion } from '../../shared/api-schemas';
import { addDays, isWithin, type ISODate } from '../../shared/dates';

/** Categorical colour slots available to series (`--chart-1…8`). */
export const MAX_SERIES = 8;
/** Series key for people folded into "Others". */
export const OTHER_KEY = '__other__';

export interface PersonSeries {
  key: string;
  label: string;
  slot: number;
}

export interface PersonChart {
  series: PersonSeries[];
  /** Per week (oldest first): Monday and counts keyed by series key. */
  weeks: { weekStart: ISODate; values: Record<string, number> }[];
}

/**
 * Shapes `byPersonWeekly` output for a stacked bar chart. At most eight series: when there are
 * more people, the seven busiest keep their own colour and the rest fold into "Others" (never a
 * generated ninth hue). Series are alphabetical, so a person's colour doesn't follow their rank.
 */
export function personChart(weekly: PersonWeekly, otherLabel: string): PersonChart {
  const overflow = weekly.people.length > MAX_SERIES;
  const kept = overflow ? weekly.people.slice(0, MAX_SERIES - 1) : weekly.people;
  const keptSet = new Set(kept);
  const named = [...kept].sort((a, b) => a.localeCompare(b));
  const series: PersonSeries[] = named.map((name, i) => ({ key: name, label: name, slot: i + 1 }));
  if (overflow) series.push({ key: OTHER_KEY, label: otherLabel, slot: MAX_SERIES });

  const weeks = weekly.weeks.map((week) => {
    const values: Record<string, number> = {};
    for (const [name, count] of Object.entries(week.counts)) {
      const key = keptSet.has(name) ? name : OTHER_KEY;
      values[key] = (values[key] ?? 0) + count;
    }
    return { weekStart: week.weekStart, values };
  });
  return { series, weeks };
}

/** Number of completions dated in [from, to]. */
export function countBetween(
  completions: readonly Pick<Completion, 'doneOn'>[],
  from: ISODate,
  to: ISODate,
): number {
  return completions.reduce((n, c) => (isWithin(c.doneOn, from, to) ? n + 1 : n), 0);
}

/** Sign-offs in the last `days` days (ending today) and in the `days` before that. */
export function recentCounts(
  completions: readonly Pick<Completion, 'doneOn'>[],
  today: ISODate,
  days: number,
): { current: number; previous: number } {
  const start = addDays(today, -(days - 1));
  return {
    current: countBetween(completions, start, today),
    previous: countBetween(completions, addDays(start, -days), addDays(start, -1)),
  };
}
