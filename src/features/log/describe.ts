import type { Completion, Task, TaskId } from '../../shared/api-schemas';
import { localized, type Lang } from '../../shared/lang';

/** Display facts about a sign-off: the name of the work it refers to. */
export interface WorkView {
  /** Task title in `lang`, the ad-hoc title, or the raw task id if the task no longer exists. */
  title: string;
  /** The task, when the row references one that exists (archived tasks included). */
  task?: Task;
  /** True for ad-hoc work (no task). */
  adHoc: boolean;
}

/**
 * Describes the work a completion refers to, in the given language. `taskById` should hold every
 * task including archived ones, so history keeps showing real titles.
 */
export function describeWork(
  row: Pick<Completion, 'taskId' | 'title'>,
  taskById: ReadonlyMap<TaskId, Task>,
  lang: Lang,
): WorkView {
  if (row.taskId === null) return { title: row.title ?? '', adHoc: true };
  const task = taskById.get(row.taskId);
  if (!task) return { title: row.title ?? row.taskId, adHoc: false };
  return { title: localized(task.title, task.titleEs, lang), task, adHoc: false };
}
