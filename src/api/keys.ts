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
  tasks: {
    all: [ROOT, 'tasks'] as const,
    /** every task, archived included, when `archived` */
    list: (archived: boolean) => [ROOT, 'tasks', 'list', archived ? 'all' : 'active'] as const,
    detail: (id: string) => [ROOT, 'tasks', 'detail', id] as const,
  },
  incidents: {
    all: [ROOT, 'incidents'] as const,
    list: () => [ROOT, 'incidents', 'list'] as const,
    detail: (id: string) => [ROOT, 'incidents', 'detail', id] as const,
  },
  notes: {
    all: [ROOT, 'notes'] as const,
  },
} as const;

export type CompletionsListKey = ReturnType<typeof queryKeys.completions.list>;

export const mutationKeys = {
  signOff: [ROOT, 'signOff'] as const,
  undoSignOff: [ROOT, 'undoSignOff'] as const,
  tasks: [ROOT, 'taskMutation'] as const,
  incidents: [ROOT, 'incidentMutation'] as const,
  notes: [ROOT, 'notesMutation'] as const,
} as const;
