/**
 * Pure cache transforms used by the optimistic mutations. Each returns a new array (never
 * mutates) and mirrors the server's ordering so an optimistic row lands where the refetch will
 * put it.
 */
import type {
  Completion,
  Note,
  PlanItem,
  createCompletionReqSchema,
  createNoteReqSchema,
  createPlanItemReqSchema,
  updatePlanItemReqSchema,
} from '../shared/api-schemas';
import type { z } from 'zod';
import type { CompletionsRange } from './keys';

type ParsedCompletionReq = z.output<typeof createCompletionReqSchema>;
type ParsedPlanItemReq = z.output<typeof createPlanItemReqSchema>;
type ParsedPlanPatch = z.output<typeof updatePlanItemReqSchema>;
type ParsedNoteReq = z.output<typeof createNoteReqSchema>;

const desc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);
const asc = (a: string, b: string) => -desc(a, b);

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

/** Server order for completion lists: newest `doneOn` first, then newest `createdAt`, then id. */
export function compareCompletionsNewestFirst(a: Completion, b: Completion): number {
  return desc(a.doneOn, b.doneOn) || desc(a.createdAt, b.createdAt) || desc(a.id, b.id);
}

/** Server order for the latest-per-task list: newest `doneOn` first, then task id. */
function compareLatest(a: Completion, b: Completion): number {
  return desc(a.doneOn, b.doneOn) || asc(a.taskId ?? '', b.taskId ?? '');
}

export function buildOptimisticCompletion(
  req: ParsedCompletionReq,
  loggedBy: string,
  planItemId: string | null,
  createdAt: string,
): Completion {
  return {
    id: req.id,
    taskId: req.taskId ?? null,
    title: req.title ?? null,
    doneOn: req.doneOn,
    doneBy: req.doneBy,
    loggedBy,
    note: req.note ?? null,
    planItemId,
    createdAt,
  };
}

/** Whether a completions list fetched with `range` would contain `completion`. */
export function completionMatchesRange(completion: Completion, range: CompletionsRange): boolean {
  if (range.from !== undefined && completion.doneOn < range.from) return false;
  if (range.to !== undefined && completion.doneOn > range.to) return false;
  if (range.task !== undefined && completion.taskId !== range.task) return false;
  return true;
}

/** Inserts (or replaces, by id) a completion, keeping server order. */
export function insertCompletion(
  list: readonly Completion[],
  completion: Completion,
): Completion[] {
  return [...list.filter((c) => c.id !== completion.id), completion].sort(
    compareCompletionsNewestFirst,
  );
}

export function removeCompletion(list: readonly Completion[], id: string): Completion[] {
  return list.filter((c) => c.id !== id);
}

/**
 * Applies a new completion to the latest-per-task list. Returns the updated list and the entry it
 * displaced (so an undo can restore it). Ad-hoc completions and older sign-offs leave it as is.
 */
export function upsertLatest(
  latest: readonly Completion[],
  completion: Completion,
): { list: Completion[]; replaced: Completion | undefined; changed: boolean } {
  if (completion.taskId === null) return { list: [...latest], replaced: undefined, changed: false };
  const current = latest.find((c) => c.taskId === completion.taskId);
  if (current && compareCompletionsNewestFirst(current, completion) < 0) {
    return { list: [...latest], replaced: undefined, changed: false };
  }
  const list = [...latest.filter((c) => c.taskId !== completion.taskId), completion].sort(
    compareLatest,
  );
  return { list, replaced: current, changed: true };
}

/**
 * Removes completion `id` from the latest-per-task list, putting `fallback` (the task's previous
 * latest sign-off, when known) in its place.
 */
export function removeFromLatest(
  latest: readonly Completion[],
  id: string,
  fallback: Completion | undefined,
): Completion[] {
  const removed = latest.find((c) => c.id === id);
  if (!removed) return [...latest];
  const rest = latest.filter((c) => c.id !== id);
  return fallback && fallback.taskId === removed.taskId
    ? [...rest, fallback].sort(compareLatest)
    : rest;
}

/** Newest completion for `taskId` in `lists`, ignoring `excludeId`. */
export function newestForTask(
  lists: readonly (readonly Completion[])[],
  taskId: string,
  excludeId: string,
): Completion | undefined {
  let best: Completion | undefined;
  for (const list of lists) {
    for (const c of list) {
      if (c.taskId !== taskId || c.id === excludeId) continue;
      if (!best || compareCompletionsNewestFirst(c, best) < 0) best = c;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Plan items
// ---------------------------------------------------------------------------

export function buildOptimisticPlanItem(
  req: ParsedPlanItemReq,
  createdBy: string,
  now: string,
): PlanItem {
  return {
    id: req.id,
    weekStart: req.weekStart,
    taskId: req.taskId ?? null,
    title: req.title ?? null,
    assignee: req.assignee ?? null,
    note: req.note ?? null,
    status: 'planned',
    createdBy,
    createdAt: now,
    updatedAt: now,
    completion: null,
  };
}

/** Server order for a week's plan: creation order. */
function comparePlanItems(a: PlanItem, b: PlanItem): number {
  return asc(a.createdAt, b.createdAt) || asc(a.id, b.id);
}

export function insertPlanItem(items: readonly PlanItem[], item: PlanItem): PlanItem[] {
  return [...items.filter((i) => i.id !== item.id), item].sort(comparePlanItems);
}

export function replacePlanItem(items: readonly PlanItem[], item: PlanItem): PlanItem[] {
  return items.map((i) => (i.id === item.id ? item : i));
}

export function removePlanItem(items: readonly PlanItem[], id: string): PlanItem[] {
  return items.filter((i) => i.id !== id);
}

/** The `planned` item for `taskId` (what the server auto-links a sign-off to). */
export function findPlannedItemForTask(
  items: readonly PlanItem[],
  taskId: string,
): PlanItem | undefined {
  return items.find((i) => i.taskId === taskId && i.status === 'planned');
}

export function markPlanItemDone(
  items: readonly PlanItem[],
  planItemId: string,
  completion: Pick<Completion, 'id' | 'doneOn' | 'doneBy'>,
  now: string,
): PlanItem[] {
  return items.map((i) =>
    i.id === planItemId
      ? {
          ...i,
          status: 'done' as const,
          updatedAt: now,
          completion: { id: completion.id, doneOn: completion.doneOn, doneBy: completion.doneBy },
        }
      : i,
  );
}

/** Undo of a sign-off: the plan item it fulfilled goes back to `planned`. */
export function revertPlanItemsForCompletion(
  items: readonly PlanItem[],
  completionId: string,
  now: string,
): PlanItem[] {
  return items.map((i) =>
    i.completion?.id === completionId
      ? { ...i, status: 'planned' as const, completion: null, updatedAt: now }
      : i,
  );
}

export function applyPlanPatch(item: PlanItem, patch: ParsedPlanPatch, now: string): PlanItem {
  return {
    ...item,
    assignee: patch.assignee === undefined ? item.assignee : patch.assignee,
    note: patch.note === undefined ? item.note : patch.note,
    status: patch.status ?? item.status,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function buildOptimisticNote(req: ParsedNoteReq, author: string, createdAt: string): Note {
  return { id: req.id, author, body: req.body, pinned: req.pinned ?? false, createdAt };
}

/** Server order: pinned first, then newest first. */
function compareNotes(a: Note, b: Note): number {
  return Number(b.pinned) - Number(a.pinned) || desc(a.createdAt, b.createdAt) || desc(a.id, b.id);
}

export function insertNote(notes: readonly Note[], note: Note): Note[] {
  return [...notes.filter((n) => n.id !== note.id), note].sort(compareNotes);
}

export function removeNote(notes: readonly Note[], id: string): Note[] {
  return notes.filter((n) => n.id !== id);
}
