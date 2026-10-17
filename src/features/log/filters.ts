import type { Completion } from '../../shared/api-schemas';
import { addDays, isISODate, type ISODate } from '../../shared/dates';

export interface LogFilters {
  /** Person (matched case-insensitively against "done by"); '' = everyone. */
  person: string;
  /** Inclusive date range; '' = open-ended (the server then defaults to its lookback). */
  from: ISODate | '';
  to: ISODate | '';
}

/** Days shown by default (today and the 89 before it). */
export const DEFAULT_LOG_DAYS = 90;

export function defaultFilters(today: ISODate): LogFilters {
  return { person: '', from: addDays(today, -(DEFAULT_LOG_DAYS - 1)), to: today };
}

/** Reads filters from the URL (`?person=&from=&to=`), falling back to the defaults. */
export function readFilters(params: URLSearchParams, today: ISODate): LogFilters {
  const defaults = defaultFilters(today);
  const date = (key: 'from' | 'to'): ISODate | '' => {
    const v = params.get(key);
    if (v === null) return defaults[key];
    return v === '' || !isISODate(v) ? '' : v;
  };
  return {
    person: params.get('person')?.trim() ?? '',
    from: date('from'),
    to: date('to'),
  };
}

/** Writes filters to URL params, leaving out values equal to the defaults. */
export function writeFilters(filters: LogFilters, today: ISODate): URLSearchParams {
  const defaults = defaultFilters(today);
  const params = new URLSearchParams();
  if (filters.person) params.set('person', filters.person);
  if (filters.from !== defaults.from) params.set('from', filters.from);
  if (filters.to !== defaults.to) params.set('to', filters.to);
  return params;
}

export function isDefaultFilters(filters: LogFilters, today: ISODate): boolean {
  return writeFilters(filters, today).toString() === '';
}

/** True when both ends are set and the range runs backwards. */
export function isInvalidRange(filters: Pick<LogFilters, 'from' | 'to'>): boolean {
  return filters.from !== '' && filters.to !== '' && filters.from > filters.to;
}

const personKey = (name: string) => name.trim().toLocaleLowerCase();

/** Distinct "done by" names (first spelling seen wins), alphabetical. */
export function peopleOf(completions: readonly Pick<Completion, 'doneBy'>[]): string[] {
  const names = new Map<string, string>();
  for (const c of completions) {
    const key = personKey(c.doneBy);
    if (key && !names.has(key)) names.set(key, c.doneBy.trim());
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Applies the person and date filters and sorts newest first: by date, then by when it was
 * logged.
 */
export function filterCompletions(
  completions: readonly Completion[],
  filters: LogFilters,
): Completion[] {
  const person = personKey(filters.person);
  return completions
    .filter((c) => {
      if (person && personKey(c.doneBy) !== person) return false;
      if (filters.from && c.doneOn < filters.from) return false;
      if (filters.to && c.doneOn > filters.to) return false;
      return true;
    })
    .sort((a, b) =>
      a.doneOn !== b.doneOn
        ? b.doneOn.localeCompare(a.doneOn)
        : b.createdAt.localeCompare(a.createdAt),
    );
}

export interface DayGroup {
  date: ISODate;
  items: Completion[];
}

/** Groups an already sorted list by `doneOn`, keeping order. */
export function groupByDay(completions: readonly Completion[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const c of completions) {
    const last = groups[groups.length - 1];
    if (last && last.date === c.doneOn) last.items.push(c);
    else groups.push({ date: c.doneOn, items: [c] });
  }
  return groups;
}
