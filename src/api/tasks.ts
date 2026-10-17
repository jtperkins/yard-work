/**
 * Tasks live in the database. Queries are public; create/edit/archive need a session and a 401
 * marks the session as signed out. Not optimistic: the server makes the id (a slug of the title).
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Task, TaskInput, UpdateTaskReq } from '../shared/api-schemas';
import type { ApiClient } from './client';
import { useApiClient } from './context';
import { mutationKeys, queryKeys } from './keys';
import { handleAuthError, invalidateWhenIdle } from './mutation-utils';

export function tasksOptions(client: ApiClient, archived: boolean) {
  return queryOptions({
    queryKey: queryKeys.tasks.list(archived),
    queryFn: ({ signal }) => client.listTasks({ archived }, signal),
  });
}

/**
 * `GET /api/tasks`: active tasks by title, or every task (archived too) with `archived: true`.
 * Use the full list to look tasks up by id for history (Log, CSV), the active one for work.
 */
export function useTasks(options: { archived?: boolean } = {}) {
  return useQuery(tasksOptions(useApiClient(), options.archived ?? false));
}

/** `GET /api/tasks/:id`: one task, archived or not. */
export function useTask(id: string | undefined) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.tasks.detail(id ?? ''),
    queryFn: ({ signal }) => client.getTask(id ?? '', signal),
    enabled: id !== undefined && id !== '',
  });
}

const TASKS = [queryKeys.tasks.all] as const;

function cacheTask(qc: ReturnType<typeof useQueryClient>, task: Task): void {
  qc.setQueryData<Task>(queryKeys.tasks.detail(task.id), task);
}

/** `POST /api/tasks`. Resolves with the created task (its id is what the server made). */
export function useCreateTask() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<Task, Error, TaskInput>({
    mutationKey: mutationKeys.tasks,
    mutationFn: (req) => client.createTask(req),
    onSuccess: (task) => cacheTask(qc, task),
    onError: (error) => handleAuthError(qc, error),
    onSettled: () => invalidateWhenIdle(qc, TASKS),
  });
}

export interface UpdateTaskVars {
  id: string;
  patch: UpdateTaskReq;
}

/** `PATCH /api/tasks/:id`: edit fields, or `{ archived: true | false }`. */
export function useUpdateTask() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation<Task, Error, UpdateTaskVars>({
    mutationKey: mutationKeys.tasks,
    mutationFn: ({ id, patch }) => client.updateTask(id, patch),
    onSuccess: (task) => cacheTask(qc, task),
    onError: (error) => handleAuthError(qc, error),
    onSettled: () => invalidateWhenIdle(qc, TASKS),
  });
}
