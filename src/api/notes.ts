/**
 * Handoff notes — private: the query only runs when signed in, and a 401 marks the session as
 * signed out. Add/delete are optimistic and rolled back on error.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createNoteReqSchema,
  type CreateNoteReq,
  type Note,
  type OkRes,
} from '../shared/api-schemas';
import { nowISO } from '../shared/dates';
import { useSession } from './auth';
import { buildOptimisticNote, insertNote, removeNote } from './cache';
import { useApiClient } from './context';
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

const NOTES = [queryKeys.notes.all] as const;

/** `GET /api/notes` (pinned first, then newest). Disabled while signed out. */
export function useNotes() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.notes.all,
    queryFn: async ({ signal }) => {
      try {
        return await client.listNotes(signal);
      } catch (error) {
        handleAuthError(qc, error);
        throw error;
      }
    },
    enabled: isSignedIn,
  });
}

export type AddNoteInput = Omit<CreateNoteReq, 'id'> & { id?: string };

/** `POST /api/notes` with a client-generated id. */
export function useAddNote(): IdMutationResult<Note, CreateNoteReq, OptimisticContext> {
  const client = useApiClient();
  const qc = useQueryClient();
  const mutation = useMutation<Note, Error, CreateNoteReq, OptimisticContext>({
    mutationKey: mutationKeys.notes,
    mutationFn: (req) => client.createNote(req),
    ...idempotentCreateRetry,
    onMutate: async (req) => {
      const snapshot = await snapshotQueries(qc, NOTES);
      const parsed = createNoteReqSchema.safeParse(req);
      if (parsed.success) {
        const note = buildOptimisticNote(parsed.data, cachedUserName(qc), nowISO());
        qc.setQueryData<Note[]>(queryKeys.notes.all, (notes) =>
          notes ? insertNote(notes, note) : notes,
        );
      }
      return { snapshot };
    },
    onSuccess: (note) => {
      qc.setQueryData<Note[]>(queryKeys.notes.all, (notes) =>
        notes ? insertNote(notes, note) : notes,
      );
    },
    onError: (error, _req, context) => {
      restoreSnapshot(qc, context?.snapshot);
      handleAuthError(qc, error);
    },
    onSettled: () => invalidateWhenIdle(qc, NOTES),
  });
  return useWithClientId(mutation);
}

/** `DELETE /api/notes/:id` (soft delete). */
export function useDeleteNote() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<OkRes, Error, string, OptimisticContext>({
    mutationKey: mutationKeys.notes,
    mutationFn: (id) => client.deleteNote(id),
    onMutate: async (id) => {
      const snapshot = await snapshotQueries(qc, NOTES);
      qc.setQueryData<Note[]>(queryKeys.notes.all, (notes) =>
        notes ? removeNote(notes, id) : notes,
      );
      return { snapshot };
    },
    onError: (error, _id, context) => {
      restoreSnapshot(qc, context?.snapshot);
      handleAuthError(qc, error);
    },
    onSettled: () => invalidateWhenIdle(qc, NOTES),
  });
}
