import type { Task, TaskId } from '../../shared/api-schemas';

/** Tasks by id (an empty map while the list is loading). */
export function taskMap(tasks: readonly Task[] | undefined): ReadonlyMap<TaskId, Task> {
  return new Map((tasks ?? []).map((task) => [task.id, task]));
}
