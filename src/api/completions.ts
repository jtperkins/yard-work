/**
 * Completion (sign-off) queries and mutations, plus the derived task-status hook.
 *
 * Sign-off is optimistic: the new row appears at once in every cached completions list whose
 * range contains it and in the latest-per-task list (so Board/Tasks statuses flip immediately).
 * A partial sign-off lands as its own entry and never displaces the last full one. Errors roll
 * everything back.
 */
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import {
  compareByUrgency,
  percentOnTrack,
  taskStatuses,
  type TaskStatus,
} from '../domain/schedule';
import {
  createCompletionReqSchema,
  type Completion,
  type CompletionsQuery,
  type CreateCompletionReq,
  type OkRes,
  type Task,
  type TaskId,
} from '../shared/api-schemas';
import { nowISO, todayCR, type ISODate } from '../shared/dates';
import {
  buildOptimisticCompletion,
  completionMatchesRange,
  insertCompletion,
  newestForTask,
  removeCompletion,
  removeFromLatest,
  upsertLatest,
} from './cache';
import type { ApiClient } from './client';
import { useApiClient } from './context';
import { mutationKeys, queryKeys, type CompletionsListKey, type CompletionsRange } from './keys';
import { useTasks } from './tasks';
import {
  cachedUserName,
  handleAuthError,
  idempotentCreateRetry,
  invalidateWhenIdle,
  restoreSnapshot,
  snapshotQueries,
  useWithClientId,
  type IdMutationResult,
  type OptimisticContext,
} from './mutation-utils';

const AFFECTED = [queryKeys.completions.all] as const;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

function latestOptions(client: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.completions.latest(),
    queryFn: ({ signal }) => client.latestCompletions(signal),
  });
}

/**
 * `GET /api/completions` for a date range (newest first). Omitting `from`/`to` uses the server
 * default (last 400 days up to today); `task` filters to one catalog task.
 */
export function useCompletions(query: CompletionsQuery = {}, options: { enabled?: boolean } = {}) {
  const client = useApiClient();
  const key = queryKeys.completions.list(query);
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => client.listCompletions(key[3], signal),
    enabled: options.enabled ?? true,
  });
}

/** `GET /api/completions/latest`: newest full + newest partial sign-off per task, no date limit. */
export function useLatestCompletions() {
  return useQuery(latestOptions(useApiClient()));
}

export interface TaskStatuses {
  /** Status per task. */
  byId: ReadonlyMap<TaskId, TaskStatus>;
  /** All task statuses, most urgent first (overdue/never, due-soon, ok, done). */
  list: readonly TaskStatus[];
  /** Open tasks not overdue/never, as a whole-number percentage (100 when none are open). */
  percentOnTrack: number;
}

export function buildTaskStatuses(
  tasks: readonly Task[],
  completions: readonly Completion[],
  today: ISODate,
): TaskStatuses {
  const byId = taskStatuses(tasks, completions, today);
  const list = [...byId.values()].sort(compareByUrgency);
  return { byId, list, percentOnTrack: percentOnTrack(list) };
}

/**
 * Status of every active task as of `date` (default: today in Costa Rica), derived from the task
 * list and the latest completions + domain scheduling rules. Shares the latest cache entry with
 * `useLatestCompletions`, so a sign-off updates it optimistically.
 *
 * `data` exists only once BOTH lists have loaded and `isError` is true when either failed, so
 * callers can never show a percentage computed from a missing task list.
 */
export function useTaskStatuses(date?: ISODate) {
  const tasks = useTasks();
  const latest = useQuery(latestOptions(useApiClient()));
  const today = date ?? todayCR();
  const tasksData = tasks.data;
  const latestData = latest.data;
  const data = useMemo(
    () =>
      tasksData !== undefined && latestData !== undefined
        ? buildTaskStatuses(tasksData, latestData, today)
        : undefined,
    [tasksData, latestData, today],
  );
  const { refetch: refetchTasks } = tasks;
  const { refetch: refetchLatest } = latest;
  const refetch = useCallback(
    () => Promise.all([refetchTasks(), refetchLatest()]),
    [refetchTasks, refetchLatest],
  );
  const isError = tasks.isError || latest.isError;
  return {
    data,
    isPending: data === undefined && !isError,
    isError,
    error: tasks.error ?? latest.error,
    refetch,
  };
}

// ---------------------------------------------------------------------------
// Sign off
// ---------------------------------------------------------------------------

/**
 * Per-QueryClient memory of which latest-per-task entry an optimistic sign-off displaced, so an
 * undo can put it back without waiting for a refetch.
 */
const displacedLatest = new WeakMap<QueryClient, Map<string, Completion>>();

function displacedFor(qc: QueryClient): Map<string, Completion> {
  let map = displacedLatest.get(qc);
  if (!map) {
    map = new Map();
    displacedLatest.set(qc, map);
  }
  return map;
}

function applyOptimisticSignOff(qc: QueryClient, req: CreateCompletionReq): void {
  const parsed = createCompletionReqSchema.safeParse(req);
  // Invalid input: no optimistic row; the server's 400 comes back through onError.
  if (!parsed.success) return;
  const input = parsed.data;
  const now = nowISO();

  const completion = buildOptimisticCompletion(input, cachedUserName(qc), now);

  for (const [key, list] of qc.getQueriesData<Completion[]>({
    queryKey: queryKeys.completions.lists(),
  })) {
    const range = (key as CompletionsListKey)[3] as CompletionsRange | undefined;
    if (list && range && completionMatchesRange(completion, range)) {
      qc.setQueryData<Completion[]>(key, insertCompletion(list, completion));
    }
  }

  const latest = qc.getQueryData<Completion[]>(queryKeys.completions.latest());
  if (latest) {
    const result = upsertLatest(latest, completion);
    if (result.changed) {
      qc.setQueryData<Completion[]>(queryKeys.completions.latest(), result.list);
      if (result.replaced) displacedFor(qc).set(completion.id, result.replaced);
    }
  }
}

export type SignOffInput = Omit<CreateCompletionReq, 'id'> & { id?: string };

/**
 * `POST /api/completions` with a client-generated id. `mutate(input)` returns that id, which is
 * what `useUndoSignOff` needs for the Undo toast.
 */
export function useSignOff(): IdMutationResult<Completion, CreateCompletionReq, OptimisticContext> {
  const client = useApiClient();
  const qc = useQueryClient();
  const mutation = useMutation<Completion, Error, CreateCompletionReq, OptimisticContext>({
    mutationKey: mutationKeys.signOff,
    mutationFn: (req) => client.createCompletion(req),
    ...idempotentCreateRetry,
    onMutate: async (req) => {
      const snapshot = await snapshotQueries(qc, AFFECTED);
      applyOptimisticSignOff(qc, req);
      return { snapshot };
    },
    onError: (error, req, context) => {
      restoreSnapshot(qc, context?.snapshot);
      displacedFor(qc).delete(req.id);
      handleAuthError(qc, error);
    },
    onSettled: () => invalidateWhenIdle(qc, AFFECTED),
  });
  return useWithClientId(mutation);
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

function applyOptimisticUndo(qc: QueryClient, id: string): void {
  const lists = qc.getQueriesData<Completion[]>({ queryKey: queryKeys.completions.lists() });

  const latest = qc.getQueryData<Completion[]>(queryKeys.completions.latest());
  const removed = latest?.find((c) => c.id === id);
  if (latest && removed?.taskId) {
    const cachedLists = lists.flatMap(([, list]) => (list ? [list] : []));
    const fallback =
      displacedFor(qc).get(id) ?? newestForTask(cachedLists, removed.taskId, id, removed.partial);
    qc.setQueryData<Completion[]>(
      queryKeys.completions.latest(),
      removeFromLatest(latest, id, fallback),
    );
  }

  for (const [key, list] of lists) {
    if (list) qc.setQueryData<Completion[]>(key, removeCompletion(list, id));
  }
}

/**
 * Waits for a still-pending sign-off with this id (e.g. the user taps Undo before a slow POST has
 * landed) so a DELETE can't overtake it and 404. Resolves `true` when the sign-off was saved or
 * none is pending, `false` when it failed (so there is nothing to delete).
 */
export function signOffSettled(qc: QueryClient, id: string): Promise<boolean> {
  const cache = qc.getMutationCache();
  const pending = cache
    .findAll({ mutationKey: mutationKeys.signOff, status: 'pending' })
    .find((m) => (m.state.variables as CreateCompletionReq | undefined)?.id === id);
  if (!pending) return Promise.resolve(true);
  return new Promise((resolve) => {
    const unsubscribe = cache.subscribe(() => {
      const { status } = pending.state;
      if (status === 'pending') return;
      unsubscribe();
      resolve(status === 'success');
    });
  });
}

/**
 * `DELETE /api/completions/:id` (soft delete). Optimistically removes the sign-off, restores the
 * task's previous latest sign-off of the same kind. If that sign-off's
 * own POST is still in flight, the DELETE waits for it (and is skipped if the POST fails).
 */
export function useUndoSignOff() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<OkRes, Error, string, OptimisticContext>({
    mutationKey: mutationKeys.undoSignOff,
    mutationFn: async (id) => {
      const saved = await signOffSettled(qc, id);
      return saved ? client.deleteCompletion(id) : { ok: true };
    },
    onMutate: async (id) => {
      const snapshot = await snapshotQueries(qc, AFFECTED);
      applyOptimisticUndo(qc, id);
      return { snapshot };
    },
    onSuccess: (_res, id) => {
      displacedFor(qc).delete(id);
    },
    onError: (error, _id, context) => {
      restoreSnapshot(qc, context?.snapshot);
      handleAuthError(qc, error);
    },
    onSettled: () => invalidateWhenIdle(qc, AFFECTED),
  });
}
