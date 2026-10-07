/** Session hooks: who is signed in, sign in (name + house code), sign out. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginReq, Me } from '../shared/api-schemas';
import { useApiClient } from './context';
import { queryKeys } from './keys';

/** `GET /api/me` → `{ name }` (`null` when signed out). */
export function useMe() {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => client.me(signal),
    staleTime: 5 * 60_000,
  });
}

export interface Session {
  /** Signed-in name, `null` when signed out or still loading. */
  name: string | null;
  isSignedIn: boolean;
  /** True until the first `/api/me` answer (render a skeleton, not a sign-in CTA). */
  isPending: boolean;
}

/** Convenience view of `useMe()` for gating write controls. */
export function useSession(): Session {
  const me = useMe();
  const name = me.data?.name ?? null;
  return { name, isSignedIn: name !== null, isPending: me.isPending };
}

/**
 * `POST /api/login`. On success the session is cached and private data (notes) refetched. A wrong
 * house code rejects with `ApiRequestError` status 401 (after a short server-side delay).
 */
export function useLogin() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<Me, Error, LoginReq>({
    mutationFn: (req) => client.login(req),
    onSuccess: async (me) => {
      qc.setQueryData<Me>(queryKeys.me(), me);
      await qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
}

/** `POST /api/logout`. Clears the cached session and drops private data (notes) from the cache. */
export function useLogout() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<Me, Error, void>({
    mutationFn: () => client.logout(),
    onSuccess: () => {
      qc.setQueryData<Me>(queryKeys.me(), { name: null });
      qc.removeQueries({ queryKey: queryKeys.notes.all });
    },
  });
}
