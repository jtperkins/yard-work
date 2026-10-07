/**
 * Weekly plan queries and mutations (all optimistic, rolled back on error), plus
 * `useWeekSuggestions` (domain `suggestForWeek` over the latest completions and the week's plan).
 */
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { suggestForWeek, type WeekSuggestion } from '../domain/week';
import {
  createPlanItemReqSchema,
  updatePlanItemReqSchema,
  type CreatePlanItemReq,
  type OkRes,
  type PlanItem,
  type UpdatePlanItemReq,
} from '../shared/api-schemas';
import {
  addDays,
  isISODate,
  nowISO,
  todayCR,
  weekStart as mondayOf,
  type ISODate,
} from '../shared/dates';
import {
  applyPlanPatch,
  buildOptimisticPlanItem,
  insertPlanItem,
  removePlanItem,
  replacePlanItem,
} from './cache';
import { useLatestCompletions } from './completions';
import { useApiClient, useCatalog } from './context';
import { mutationKeys, queryKeys } from './keys';
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

const PLAN = [queryKeys.plan.all] as const;

/** Monday of the week containing `date`, or `undefined` for a malformed date. */
function mondayOrUndefined(date: string | undefined): ISODate | undefined {
  return date !== undefined && isISODate(date) ? mondayOf(date) : undefined;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * `GET /api/plan?week=` for the week containing `weekStart` (normalised to its Monday; disabled
 * for a malformed date). Items come in creation order.
 */
export function useWeekPlan(weekStart: string | undefined) {
  const client = useApiClient();
  const monday = mondayOrUndefined(weekStart);
  return useQuery({
    queryKey: queryKeys.plan.week(monday ?? ''),
    queryFn: ({ signal }) => client.getPlan(monday ?? '', signal),
    enabled: monday !== undefined,
  });
}

/** Read-only state of a hook that combines several queries. */
export interface DerivedQueryResult<T> {
  data: T | undefined;
  /** True until every underlying query has data. */
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export interface WeekSuggestionsOptions {
  /** Evaluate statuses as of this date (default: today in Costa Rica). */
  today?: ISODate;
  /** Also suggest daily tasks (cat care). Off by default — they live on the Board's Today strip. */
  includeDaily?: boolean;
}

/** At most this many weeks before the viewed one are read when planning ahead. */
export const PLAN_AHEAD_WEEKS = 8;

/** Mondays from today's week up to (not including) `monday`, the latest `PLAN_AHEAD_WEEKS`. */
export function weeksBefore(monday: ISODate, today: ISODate): ISODate[] {
  const weeks: ISODate[] = [];
  for (let w = addDays(monday, -7); w >= mondayOf(today); w = addDays(w, -7)) {
    if (weeks.length === PLAN_AHEAD_WEEKS) break;
    weeks.unshift(w);
  }
  return weeks;
}

interface EarlierPlans {
  /** Items of every earlier week that loaded (a failed week is left out, not fatal). */
  items: PlanItem[];
  isPending: boolean;
}

function combineEarlierPlans(results: UseQueryResult<PlanItem[]>[]): EarlierPlans {
  return {
    items: results.flatMap((r) => r.data ?? []),
    isPending: results.some((r) => r.isPending),
  };
}

/**
 * Catalog tasks worth adding to the week's plan: due by the end of the week, active that week and
 * not already planned. Overdue/never first, then priority, then due date. When planning ahead,
 * the plans of the weeks in between (from this week on) are read too, so a task still planned
 * there is only suggested again once its cadence brings it back.
 */
export function useWeekSuggestions(
  weekStart: string | undefined,
  options: WeekSuggestionsOptions = {},
): DerivedQueryResult<WeekSuggestion[]> {
  const client = useApiClient();
  const { tasks, house } = useCatalog();
  const latest = useLatestCompletions();
  const plan = useWeekPlan(weekStart);
  const monday = mondayOrUndefined(weekStart);
  const today = options.today ?? todayCR();
  const includeDaily = options.includeDaily ?? false;

  const earlier = useQueries({
    queries: (monday ? weeksBefore(monday, today) : []).map((week) => ({
      queryKey: queryKeys.plan.week(week),
      queryFn: ({ signal }: { signal: AbortSignal }) => client.getPlan(week, signal),
    })),
    combine: combineEarlierPlans,
  });

  const data = useMemo(
    () =>
      latest.data && plan.data && monday && !earlier.isPending
        ? suggestForWeek(
            tasks,
            latest.data,
            [...earlier.items, ...plan.data],
            monday,
            house,
            today,
            { includeDaily },
          )
        : undefined,
    [latest.data, plan.data, earlier, monday, tasks, house, today, includeDaily],
  );
  return {
    data,
    isPending: latest.isPending || plan.isPending || earlier.isPending,
    isError: latest.isError || plan.isError,
    error: latest.error ?? plan.error,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type AddPlanItemInput = Omit<CreatePlanItemReq, 'id'> & { id?: string };

/**
 * `POST /api/plan` with a client-generated id; the item appears in its week at once. A catalog
 * task already planned that week rejects with 409 (see `isConflict`) and is rolled back.
 */
export function useAddPlanItem(): IdMutationResult<PlanItem, CreatePlanItemReq, OptimisticContext> {
  const client = useApiClient();
  const qc = useQueryClient();
  const mutation = useMutation<PlanItem, Error, CreatePlanItemReq, OptimisticContext>({
    mutationKey: mutationKeys.plan,
    mutationFn: (req) => client.createPlanItem(req),
    ...idempotentCreateRetry,
    onMutate: async (req) => {
      const snapshot = await snapshotQueries(qc, PLAN);
      const parsed = createPlanItemReqSchema.safeParse(req);
      if (parsed.success) {
        const input = parsed.data;
        const key = queryKeys.plan.week(input.weekStart);
        const items = qc.getQueryData<PlanItem[]>(key);
        const duplicate =
          input.taskId !== undefined && items?.some((i) => i.taskId === input.taskId);
        if (items && !duplicate) {
          const item = buildOptimisticPlanItem(input, cachedUserName(qc), nowISO());
          qc.setQueryData<PlanItem[]>(key, insertPlanItem(items, item));
        }
      }
      return { snapshot };
    },
    onSuccess: (item) => {
      qc.setQueryData<PlanItem[]>(queryKeys.plan.week(item.weekStart), (items) =>
        items ? insertPlanItem(items, item) : items,
      );
    },
    onError: (error, _req, context) => {
      restoreSnapshot(qc, context?.snapshot);
      handleAuthError(qc, error);
    },
    onSettled: () => invalidateWhenIdle(qc, PLAN),
  });
  return useWithClientId(mutation);
}

export interface UpdatePlanItemVars {
  id: string;
  /** `null`/blank clears assignee or note; `status` toggles planned ↔ skipped. */
  patch: UpdatePlanItemReq;
}

/** `PATCH /api/plan/:id`. A signed-off (`done`) item rejects with 409 and is rolled back. */
export function useUpdatePlanItem() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<PlanItem, Error, UpdatePlanItemVars, OptimisticContext>({
    mutationKey: mutationKeys.plan,
    mutationFn: ({ id, patch }) => client.updatePlanItem(id, patch),
    onMutate: async ({ id, patch }) => {
      const snapshot = await snapshotQueries(qc, PLAN);
      const parsed = updatePlanItemReqSchema.safeParse(patch);
      if (parsed.success) {
        const now = nowISO();
        qc.setQueriesData<PlanItem[]>({ queryKey: queryKeys.plan.all }, (items) =>
          items?.map((i) => (i.id === id ? applyPlanPatch(i, parsed.data, now) : i)),
        );
      }
      return { snapshot };
    },
    onSuccess: (item) => {
      qc.setQueryData<PlanItem[]>(queryKeys.plan.week(item.weekStart), (items) =>
        items ? replacePlanItem(items, item) : items,
      );
    },
    onError: (error, _vars, context) => {
      restoreSnapshot(qc, context?.snapshot);
      handleAuthError(qc, error);
    },
    onSettled: () => invalidateWhenIdle(qc, PLAN),
  });
}

/** `DELETE /api/plan/:id` (hard delete). A signed-off item rejects with 409 and is rolled back. */
export function useRemovePlanItem() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<OkRes, Error, string, OptimisticContext>({
    mutationKey: mutationKeys.plan,
    mutationFn: (id) => client.deletePlanItem(id),
    onMutate: async (id) => {
      const snapshot = await snapshotQueries(qc, PLAN);
      qc.setQueriesData<PlanItem[]>({ queryKey: queryKeys.plan.all }, (items) =>
        items ? removePlanItem(items, id) : items,
      );
      return { snapshot };
    },
    onError: (error, _id, context) => {
      restoreSnapshot(qc, context?.snapshot);
      handleAuthError(qc, error);
    },
    onSettled: () => invalidateWhenIdle(qc, PLAN),
  });
}
