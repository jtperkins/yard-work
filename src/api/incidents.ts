/**
 * Incident reports are private: queries only run when signed in and a 401 marks the session as
 * signed out. The create carries a client-generated id (a repeat is answered with the stored row).
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { CreateIncidentReq, IncidentFile, IncidentRes, OkRes } from '../shared/api-schemas';
import { useSession } from './auth';
import { useApiClient } from './context';
import { mutationKeys, queryKeys } from './keys';
import {
  handleAuthError,
  idempotentCreateRetry,
  invalidateWhenIdle,
  useWithClientId,
  type IdMutationResult,
} from './mutation-utils';

const INCIDENTS = [queryKeys.incidents.all] as const;

/** Runs a private read; a 401 marks the session as signed out before the error propagates. */
async function privateRead<T>(qc: QueryClient, read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    handleAuthError(qc, error);
    throw error;
  }
}

/** `GET /api/incidents` (newest first). Disabled while signed out. */
export function useIncidents() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.incidents.list(),
    queryFn: ({ signal }) => privateRead(qc, () => client.listIncidents(signal)),
    enabled: isSignedIn,
  });
}

/** `GET /api/incidents/:id`: the incident and its files. Disabled while signed out. */
export function useIncident(id: string | undefined) {
  const client = useApiClient();
  const qc = useQueryClient();
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.incidents.detail(id ?? ''),
    queryFn: ({ signal }) => privateRead(qc, () => client.getIncident(id ?? '', signal)),
    enabled: isSignedIn && id !== undefined && id !== '',
  });
}

export type CreateIncidentInput = Omit<CreateIncidentReq, 'id'> & { id?: string };

/** `POST /api/incidents` with a client-generated id. */
export function useCreateIncident(): IdMutationResult<IncidentRes, CreateIncidentReq, unknown> {
  const client = useApiClient();
  const qc = useQueryClient();
  const mutation = useMutation<IncidentRes, Error, CreateIncidentReq>({
    mutationKey: mutationKeys.incidents,
    mutationFn: (req) => client.createIncident(req),
    ...idempotentCreateRetry,
    onSuccess: (res) => qc.setQueryData(queryKeys.incidents.detail(res.incident.id), res),
    onError: (error) => handleAuthError(qc, error),
    onSettled: () => invalidateWhenIdle(qc, INCIDENTS),
  });
  return useWithClientId(mutation);
}

export interface UploadIncidentFileVars {
  incidentId: string;
  file: File;
  /** the media type the server checks (see `fileMediaType`) */
  mediaType: string;
}

/** `POST /api/incidents/:id/files`: one file per call. */
export function useUploadIncidentFile() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<IncidentFile, Error, UploadIncidentFileVars>({
    mutationKey: mutationKeys.incidents,
    mutationFn: ({ incidentId, file, mediaType }) =>
      client.uploadIncidentFile(incidentId, file, mediaType),
    onError: (error) => handleAuthError(qc, error),
    onSettled: () => invalidateWhenIdle(qc, INCIDENTS),
  });
}

/** `DELETE /api/incidents/:id` (soft delete). */
export function useDeleteIncident() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<OkRes, Error, string>({
    mutationKey: mutationKeys.incidents,
    mutationFn: (id) => client.deleteIncident(id),
    onError: (error) => handleAuthError(qc, error),
    onSettled: () => invalidateWhenIdle(qc, INCIDENTS),
  });
}
