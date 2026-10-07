/**
 * Shared plumbing for the optimistic mutations: cache snapshots + rollback, "invalidate once the
 * last overlapping mutation settles", session-expiry handling and client-generated ids.
 */
import {
  type MutateOptions,
  type QueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Me } from '../shared/api-schemas';
import { isNetworkError, isUnauthorized } from './errors';
import { newId } from './ids';
import { queryKeys } from './keys';

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export type CacheSnapshot = readonly (readonly [QueryKey, unknown])[];

/** Optimistic context returned by `onMutate` and handed back to `onError` for rollback. */
export interface OptimisticContext {
  snapshot: CacheSnapshot;
}

/** Cancels in-flight fetches under each key prefix and snapshots their cached data. */
export async function snapshotQueries(
  qc: QueryClient,
  prefixes: readonly QueryKey[],
): Promise<CacheSnapshot> {
  await Promise.all(prefixes.map((queryKey) => qc.cancelQueries({ queryKey })));
  return prefixes.flatMap((queryKey) => qc.getQueriesData({ queryKey }));
}

export function restoreSnapshot(qc: QueryClient, snapshot: CacheSnapshot | undefined): void {
  if (!snapshot) return;
  for (const [key, data] of snapshot) qc.setQueryData(key, data);
}

/**
 * Invalidates `prefixes` unless another of our mutations is still running (its own refetch will
 * follow), so a refetch can't overwrite a newer optimistic update. Called from `onSettled`, where
 * the settling mutation itself still counts as pending.
 */
export function invalidateWhenIdle(qc: QueryClient, prefixes: readonly QueryKey[]): Promise<void> {
  if (qc.isMutating({ mutationKey: queryKeys.all }) > 1) return Promise.resolve();
  return Promise.all(prefixes.map((queryKey) => qc.invalidateQueries({ queryKey }))).then(
    () => undefined,
  );
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** The cached session name ('' when unknown — the server fills the real value). */
export function cachedUserName(qc: QueryClient): string {
  return qc.getQueryData<Me>(queryKeys.me())?.name ?? '';
}

/** A 401 means the session expired or was revoked: show the app as signed out. */
export function handleAuthError(qc: QueryClient, error: unknown): void {
  if (isUnauthorized(error)) qc.setQueryData<Me>(queryKeys.me(), { name: null });
}

// ---------------------------------------------------------------------------
// Retrying creates
// ---------------------------------------------------------------------------

/** Extra attempts for a create whose request never got an answer. */
export const NETWORK_RETRIES = 3;

/**
 * Retry policy for idempotent creates (client-generated id, server returns the stored row on a
 * repeat id). Only network-class failures are retried, with the same variables and so the same
 * id: if the first attempt committed but its response was lost, the retry dedupes on the server
 * instead of failing the mutation (and rolling back a row that actually exists). HTTP errors
 * (4xx/5xx) are answers, never retried.
 */
export function retryNetworkErrors(failureCount: number, error: unknown): boolean {
  return isNetworkError(error) && failureCount < NETWORK_RETRIES;
}

/** Short backoff (0.5 s, 1 s, 2 s) so a flaky-connection retry finishes while the user waits. */
export function networkRetryDelay(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 4_000);
}

/** Spread into `useMutation` options of every idempotent create. */
export const idempotentCreateRetry = {
  retry: retryNetworkErrors,
  retryDelay: networkRetryDelay,
} as const;

// ---------------------------------------------------------------------------
// Client-generated ids
// ---------------------------------------------------------------------------

/** Like `Omit`, but keeps a union of object types a union (needed for UseMutationResult). */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Mutation input whose `id` may be left out (one is generated). */
export type WithOptionalId<T extends { id: string }> = Omit<T, 'id'> & { id?: string };

/**
 * A mutation whose variables carry a client-generated id. `mutate` fills in a missing id and
 * returns it (e.g. to wire an Undo toast before the server answers); `mutateAsync` resolves with
 * the server's row.
 */
export type IdMutationResult<TData, TVars extends { id: string }, TContext> = DistributiveOmit<
  UseMutationResult<TData, Error, TVars, TContext>,
  'mutate' | 'mutateAsync'
> & {
  mutate: (
    input: WithOptionalId<TVars>,
    options?: MutateOptions<TData, Error, TVars, TContext>,
  ) => string;
  mutateAsync: (
    input: WithOptionalId<TVars>,
    options?: MutateOptions<TData, Error, TVars, TContext>,
  ) => Promise<TData>;
};

function withId<TVars extends { id: string }>(input: WithOptionalId<TVars>): TVars {
  return { ...input, id: input.id ?? newId() } as TVars;
}

export function useWithClientId<TData, TVars extends { id: string }, TContext>(
  mutation: UseMutationResult<TData, Error, TVars, TContext>,
): IdMutationResult<TData, TVars, TContext> {
  const { mutate: baseMutate, mutateAsync: baseMutateAsync } = mutation;
  const mutate = useCallback(
    (input: WithOptionalId<TVars>, options?: MutateOptions<TData, Error, TVars, TContext>) => {
      const vars = withId<TVars>(input);
      baseMutate(vars, options);
      return vars.id;
    },
    [baseMutate],
  );
  const mutateAsync = useCallback(
    (input: WithOptionalId<TVars>, options?: MutateOptions<TData, Error, TVars, TContext>) =>
      baseMutateAsync(withId<TVars>(input), options),
    [baseMutateAsync],
  );
  return { ...mutation, mutate, mutateAsync } as IdMutationResult<TData, TVars, TContext>;
}
