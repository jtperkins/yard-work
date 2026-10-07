/**
 * API layer (plan §14.2): typed fetch client, query keys, TanStack Query hooks with optimistic
 * mutations + client-generated ids, derived scheduling hooks and the catalog hook.
 *
 * Screens import from here only. Queries are public except notes; mutations need a session and a
 * 401 anywhere (other than a failed login) flips the cached session to signed out.
 */

// Client & errors
export { createApiClient } from './client';
export type { ApiClient, ApiClientOptions, FetchLike } from './client';
export {
  ApiRequestError,
  apiErrorStatus,
  isApiRequestError,
  isConflict,
  isNetworkError,
  isUnauthorized,
} from './errors';
export type { ApiErrorKind } from './errors';
export { newId } from './ids';
export { mutationKeys, normalizeRange, queryKeys } from './keys';
export type { CompletionsRange } from './keys';

// Providers & catalog
export {
  ApiClientProvider,
  CatalogProvider,
  defaultApiClient,
  useApiClient,
  useCatalog,
} from './context';
export type { ApiClientProviderProps, CatalogProviderProps } from './context';
export type { Catalog } from '../domain/catalog';

// Session
export { useLogin, useLogout, useMe, useSession } from './auth';
export type { Session } from './auth';

// Completions & statuses
export {
  buildTaskStatuses,
  useCompletions,
  useLatestCompletions,
  useSignOff,
  useTaskStatuses,
  useUndoSignOff,
} from './completions';
export type { SignOffInput, TaskStatuses } from './completions';

// Weekly plan
export {
  useAddPlanItem,
  useRemovePlanItem,
  useUpdatePlanItem,
  useWeekPlan,
  useWeekSuggestions,
} from './plan';
export type {
  AddPlanItemInput,
  DerivedQueryResult,
  UpdatePlanItemVars,
  WeekSuggestionsOptions,
} from './plan';

// Handoff notes
export { useAddNote, useDeleteNote, useNotes } from './notes';
export type { AddNoteInput } from './notes';

export type { IdMutationResult, WithOptionalId } from './mutation-utils';
