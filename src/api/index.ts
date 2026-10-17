/**
 * API layer: typed fetch client, query keys, TanStack Query hooks with optimistic mutations +
 * client-generated ids, and the derived scheduling hook.
 *
 * Screens import from here only. Queries are public except notes and incidents; mutations need a
 * session and a 401 anywhere (other than a failed login) flips the cached session to signed out.
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

// Providers
export { ApiClientProvider, defaultApiClient, useApiClient } from './context';
export type { ApiClientProviderProps } from './context';

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

// Tasks
export { useCreateTask, useTask, useTasks, useUpdateTask } from './tasks';
export type { UpdateTaskVars } from './tasks';

// Incidents
export {
  useCreateIncident,
  useDeleteIncident,
  useIncident,
  useIncidents,
  useUploadIncidentFile,
} from './incidents';
export type { CreateIncidentInput, UploadIncidentFileVars } from './incidents';

// Handoff notes
export { useAddNote, useDeleteNote, useNotes } from './notes';
export type { AddNoteInput } from './notes';

export type { IdMutationResult, WithOptionalId } from './mutation-utils';
