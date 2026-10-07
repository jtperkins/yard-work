/**
 * TanStack Query keys. Hierarchical so a prefix invalidates a whole family:
 * `queryKeys.completions.all` covers every completions list and the latest-per-task query.
 */
import type { CompletionsQuery } from '../shared/api-schemas';

const ROOT = 'yw' as const;

/** Normalised completions range: blank/undefined fields dropped so equal ranges share a key. */
export interface CompletionsRange {
  from?: string;
  to?: string;
  task?: string;
}

export function normalizeRange(query: CompletionsQuery = {}): CompletionsRange {
  const range: CompletionsRange = {};
  if (query.from) range.from = query.from;
  if (query.to) range.to = query.to;
  if (query.task) range.task = query.task;
  return range;
}

export const queryKeys = {
  all: [ROOT] as const,
  me: () => [ROOT, 'me'] as const,
  completions: {
    all: [ROOT, 'completions'] as const,
    lists: () => [ROOT, 'completions', 'list'] as const,
    list: (query?: CompletionsQuery) =>
      [ROOT, 'completions', 'list', normalizeRange(query)] as const,
    latest: () => [ROOT, 'completions', 'latest'] as const,
  },
  plan: {
    all: [ROOT, 'plan'] as const,
    week: (weekStart: string) => [ROOT, 'plan', weekStart] as const,
  },
  notes: {
    all: [ROOT, 'notes'] as const,
  },
} as const;

export type CompletionsListKey = ReturnType<typeof queryKeys.completions.list>;
export type PlanWeekKey = ReturnType<typeof queryKeys.plan.week>;

export const mutationKeys = {
  signOff: [ROOT, 'signOff'] as const,
  undoSignOff: [ROOT, 'undoSignOff'] as const,
  plan: [ROOT, 'planMutation'] as const,
  notes: [ROOT, 'notesMutation'] as const,
} as const;
