/**
 * Pure cache transforms used by the optimistic mutations. Each returns a new array (never
 * mutates) and mirrors the server's ordering so an optimistic row lands where the refetch will
 * put it.
 */
import type {
  Completion,
  Note,
  createCompletionReqSchema,
  createNoteReqSchema,
} from '../shared/api-schemas';
import type { z } from 'zod';
import type { CompletionsRange } from './keys';

type ParsedCompletionReq = z.output<typeof createCompletionReqSchema>;
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

/** The latest list holds one full and one partial entry per task, so both parts are the key. */
function sameLatestKey(a: Completion, b: Completion): boolean {
  return a.taskId === b.taskId && a.partial === b.partial;
}

export function buildOptimisticCompletion(
  req: ParsedCompletionReq,
  loggedBy: string,
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
    planItemId: null,
    partial: req.partial ?? false,
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
 * Applies a new completion to the latest-per-task list. A full sign-off only competes with the
 * task's full entry and a partial one with its partial entry, so a partial never displaces the
 * last full sign-off. Returns the updated list and the same-kind entry it displaced (so an undo
 * can restore it). Ad-hoc completions and older sign-offs leave it as is.
 */
export function upsertLatest(
  latest: readonly Completion[],
  completion: Completion,
): { list: Completion[]; replaced: Completion | undefined; changed: boolean } {
  if (completion.taskId === null) return { list: [...latest], replaced: undefined, changed: false };
  const current = latest.find((c) => sameLatestKey(c, completion));
  if (current && compareCompletionsNewestFirst(current, completion) < 0) {
    return { list: [...latest], replaced: undefined, changed: false };
  }
  const list = [...latest.filter((c) => !sameLatestKey(c, completion)), completion].sort(
    compareLatest,
  );
  return { list, replaced: current, changed: true };
}

/**
 * Removes completion `id` from the latest-per-task list, putting `fallback` (the task's previous
 * latest sign-off of the same kind, when known) in its place.
 */
export function removeFromLatest(
  latest: readonly Completion[],
  id: string,
  fallback: Completion | undefined,
): Completion[] {
  const removed = latest.find((c) => c.id === id);
  if (!removed) return [...latest];
  const rest = latest.filter((c) => c.id !== id);
  return fallback && sameLatestKey(fallback, removed)
    ? [...rest, fallback].sort(compareLatest)
    : rest;
}

/** Newest completion of one kind (`partial` or full) for `taskId` in `lists`, ignoring `excludeId`. */
export function newestForTask(
  lists: readonly (readonly Completion[])[],
  taskId: string,
  excludeId: string,
  partial: boolean,
): Completion | undefined {
  let best: Completion | undefined;
  for (const list of lists) {
    for (const c of list) {
      if (c.taskId !== taskId || c.id === excludeId || c.partial !== partial) continue;
      if (!best || compareCompletionsNewestFirst(c, best) < 0) best = c;
    }
  }
  return best;
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
