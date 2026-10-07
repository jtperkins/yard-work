import type { Completion } from '../../shared/api-schemas';
import { CATEGORIES, type Category, type Task, type TaskId } from '../../shared/catalog-schema';
import { addDays, isISODate, type ISODate } from '../../shared/dates';

/** Category filter value: a catalog category, ad-hoc work, or '' for everything. */
export type LogCategoryFilter = Category | 'adhoc' | '';

export interface LogFilters {
  /** Person (matched case-insensitively against "done by"); '' = everyone. */
  person: string;
  category: LogCategoryFilter;
  /** Inclusive date range; '' = open-ended (the server then defaults to its lookback). */
  from: ISODate | '';
  to: ISODate | '';
}

/** Days shown by default (today and the 89 before it). */
export const DEFAULT_LOG_DAYS = 90;

export function defaultFilters(today: ISODate): LogFilters {
  return { person: '', category: '', from: addDays(today, -(DEFAULT_LOG_DAYS - 1)), to: today };
}

const isCategoryFilter = (v: string | null): v is LogCategoryFilter =>
  v === '' || v === 'adhoc' || (CATEGORIES as readonly string[]).includes(v ?? '#');

/** Reads filters from the URL (`?person=&category=&from=&to=`), falling back to the defaults. */
export function readFilters(params: URLSearchParams, today: ISODate): LogFilters {
  const defaults = defaultFilters(today);
  const date = (key: 'from' | 'to'): ISODate | '' => {
    const v = params.get(key);
    if (v === null) return defaults[key];
    return v === '' || !isISODate(v) ? '' : v;
  };
  const category = params.get('category');
  return {
    person: params.get('person')?.trim() ?? '',
    category: isCategoryFilter(category) ? category : '',
    from: date('from'),
    to: date('to'),
  };
}

/** Writes filters to URL params, leaving out values equal to the defaults. */
export function writeFilters(filters: LogFilters, today: ISODate): URLSearchParams {
  const defaults = defaultFilters(today);
  const params = new URLSearchParams();
  if (filters.person) params.set('person', filters.person);
  if (filters.category) params.set('category', filters.category);
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
 * Applies the person and category filters (the date range is applied by the server query) and
 * sorts newest first: by date, then by when it was logged.
 */
export function filterCompletions(
  completions: readonly Completion[],
  filters: LogFilters,
  taskById: ReadonlyMap<TaskId, Pick<Task, 'category'>>,
): Completion[] {
  const person = personKey(filters.person);
  return completions
    .filter((c) => {
      if (person && personKey(c.doneBy) !== person) return false;
      if (filters.from && c.doneOn < filters.from) return false;
      if (filters.to && c.doneOn > filters.to) return false;
      if (filters.category === 'adhoc') return c.taskId === null;
      if (filters.category) {
        return c.taskId !== null && taskById.get(c.taskId)?.category === filters.category;
      }
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
