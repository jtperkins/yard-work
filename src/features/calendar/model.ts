import { latestByTask, projectDueDates } from '../../domain/schedule';
import type { Completion, PlanItem } from '../../shared/api-schemas';
import type { Category, House, Task, TaskId } from '../../shared/catalog-schema';
import { dateOfWeekday, type DayOfWeek, type ISODate } from '../../shared/dates';

/** Everything the calendar shows for one day. */
export interface CalendarDay {
  /** Sign-offs dated this day. */
  done: Completion[];
  /** Catalog tasks projected to come due this day (never before today). */
  due: Task[];
  /** Still-planned items of the week, placed on its yard day. */
  planned: PlanItem[];
}

export interface CalendarModelInput {
  /** First and last day of the visible grid (inclusive). */
  start: ISODate;
  end: ISODate;
  today: ISODate;
  /** Sign-offs in [start, end]. */
  completions: readonly Completion[];
  /** Latest sign-off per task (any date), for projections. */
  latest: readonly Completion[];
  /** Plan items of the weeks in the grid. */
  planItems: readonly PlanItem[];
  tasks: readonly Task[];
  taskById: ReadonlyMap<TaskId, Task>;
  house: Pick<House, 'rainyMonths' | 'yardDay'>;
  /** Categories to show; `null` = everything (ad-hoc work is only shown then). */
  categories: ReadonlySet<Category> | null;
}

/** Tasks done every day (cat care) would mark every cell; the calendar leaves their projections out. */
export function isDailyTask(task: Pick<Task, 'frequencyDays' | 'frequencyDaysBySeason'>): boolean {
  const cadences = [task.frequencyDays, ...Object.values(task.frequencyDaysBySeason ?? {})];
  return Math.max(...cadences) <= 1;
}

const emptyDay = (): CalendarDay => ({ done: [], due: [], planned: [] });

/**
 * Builds the per-day contents of the visible grid: sign-offs, projected due dates (hollow
 * markers) and still-planned items (on the week's yard day), honouring the category filter.
 */
export function buildCalendar(input: CalendarModelInput): Map<ISODate, CalendarDay> {
  const { start, end, today, taskById, house, categories } = input;
  const days = new Map<ISODate, CalendarDay>();
  const dayOf = (date: ISODate) => {
    let day = days.get(date);
    if (!day) {
      day = emptyDay();
      days.set(date, day);
    }
    return day;
  };
  const visible = (taskId: TaskId | null): boolean => {
    if (categories === null) return true;
    if (taskId === null) return false;
    const task = taskById.get(taskId);
    return task !== undefined && categories.has(task.category);
  };
  const inGrid = (date: ISODate) => date >= start && date <= end;

  for (const c of input.completions) {
    if (inGrid(c.doneOn) && visible(c.taskId)) dayOf(c.doneOn).done.push(c);
  }

  for (const item of input.planItems) {
    if (item.status !== 'planned' || !visible(item.taskId)) continue;
    const date = dateOfWeekday(item.weekStart, house.yardDay as DayOfWeek);
    if (inGrid(date)) dayOf(date).planned.push(item);
  }

  const latest = latestByTask([...input.latest, ...input.completions], today);
  for (const task of input.tasks) {
    if (isDailyTask(task)) continue;
    if (categories !== null && !categories.has(task.category)) continue;
    const lastDone = latest.get(task.id)?.doneOn;
    for (const date of projectDueDates(task, lastDone, start, end, house, today)) {
      dayOf(date).due.push(task);
    }
  }

  for (const day of days.values()) {
    day.done.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return days;
}
