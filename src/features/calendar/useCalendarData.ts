import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  queryKeys,
  useApiClient,
  useCatalog,
  useCompletions,
  useLatestCompletions,
} from '../../api';
import type { PlanItem } from '../../shared/api-schemas';
import type { Category } from '../../shared/catalog-schema';
import type { ISODate } from '../../shared/dates';
import { buildCalendar, type CalendarDay } from './model';

export interface CalendarData {
  days: ReadonlyMap<ISODate, CalendarDay>;
  /** Every plan item of the grid's weeks (any status), by Monday. */
  planByWeek: ReadonlyMap<ISODate, readonly PlanItem[]>;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

interface CombinedPlans {
  items: PlanItem[];
  isError: boolean;
  refetch: () => void;
}

/** Stable `combine` for useQueries, so the merged list keeps its identity between renders. */
function combinePlans(
  results: readonly { data?: PlanItem[]; isError: boolean; refetch: () => unknown }[],
): CombinedPlans {
  return {
    items: results.flatMap((r) => r.data ?? []),
    isError: results.some((r) => r.isError),
    refetch: () => {
      for (const r of results) void r.refetch();
    },
  };
}

/**
 * Loads and assembles one month grid: sign-offs in range, the latest sign-off per task (for
 * projections) and the plan of each of the grid's six weeks.
 */
export function useCalendarData(
  grid: readonly { date: ISODate }[][],
  today: ISODate,
  categories: ReadonlySet<Category> | null,
): CalendarData {
  const catalog = useCatalog();
  const client = useApiClient();
  const start = grid[0]![0]!.date;
  const end = grid[grid.length - 1]![6]!.date;
  const mondays = grid.map((week) => week[0]!.date);

  const completions = useCompletions({ from: start, to: end });
  const latest = useLatestCompletions();
  const plans = useQueries({
    queries: mondays.map((monday) => ({
      queryKey: queryKeys.plan.week(monday),
      queryFn: ({ signal }: { signal: AbortSignal }) => client.getPlan(monday, signal),
    })),
    combine: combinePlans,
  });
  const planItems = plans.items;

  const days = useMemo(
    () =>
      buildCalendar({
        start,
        end,
        today,
        completions: completions.data ?? [],
        latest: latest.data ?? [],
        planItems,
        tasks: catalog.tasks,
        taskById: catalog.taskById,
        house: catalog.house,
        categories,
      }),
    [start, end, today, completions.data, latest.data, planItems, catalog, categories],
  );

  const planByWeek = useMemo(() => {
    const map = new Map<ISODate, PlanItem[]>();
    for (const item of planItems) {
      const list = map.get(item.weekStart) ?? [];
      list.push(item);
      map.set(item.weekStart, list);
    }
    return map;
  }, [planItems]);

  return {
    days,
    planByWeek,
    isPending: completions.isPending || latest.isPending,
    isError: completions.isError || latest.isError || plans.isError,
    refetch: () => {
      void completions.refetch();
      void latest.refetch();
      plans.refetch();
    },
  };
}
