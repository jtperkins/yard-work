/**
 * Shopping / prep list for a week's plan (plan §5): the unique supplies needed by the planned
 * catalog tasks, each with the tasks that need it. No quantities, no inventory.
 */
import type { L10n, Supply, SupplyId, Task, TaskId } from '../shared/catalog-schema';
import type { PlanItemLike } from './types';

export interface SupplyTaskRef {
  task: Task;
  /** per-task note from the catalog (e.g. "small can for touch-ups") */
  note?: L10n;
}

export interface SupplyNeed {
  supply: Supply;
  /** tasks needing this supply, in plan order */
  tasks: SupplyTaskRef[];
}

/**
 * Aggregates supplies for the given plan items. Skipped items are ignored; planned and done
 * items count (so the list stays stable as the week is worked through). Ad-hoc items and
 * unknown task/supply ids are ignored. Supplies come out in catalog (supplies.json) order.
 */
export function suppliesForPlan(
  planItems: readonly Pick<PlanItemLike, 'taskId' | 'status'>[],
  tasks: readonly Task[],
  supplies: readonly Supply[],
): SupplyNeed[] {
  const taskById = new Map<TaskId, Task>(tasks.map((t) => [t.id, t]));
  const refs = new Map<SupplyId, SupplyTaskRef[]>();
  const seenTasks = new Set<TaskId>();

  for (const item of planItems) {
    if (item.status === 'skipped' || item.taskId === null || seenTasks.has(item.taskId)) continue;
    const task = taskById.get(item.taskId);
    if (!task) continue;
    seenTasks.add(task.id);
    for (const { id, note } of task.supplies) {
      const list = refs.get(id) ?? [];
      if (list.some((r) => r.task.id === task.id)) continue;
      list.push(note ? { task, note } : { task });
      refs.set(id, list);
    }
  }

  const out: SupplyNeed[] = [];
  for (const supply of supplies) {
    const list = refs.get(supply.id);
    if (list) out.push({ supply, tasks: list });
  }
  return out;
}
