import { useCallback } from 'react';
import { isConflict, useAddPlanItem, useRemovePlanItem, useUpdatePlanItem } from '../../api';
import { useT } from '../../i18n';
import type { PlanItem } from '../../shared/api-schemas';
import type { Task } from '../../shared/catalog-schema';
import type { ISODate } from '../../shared/dates';
import { useToast } from '../../ui';
import { useErrorMessage } from '../shared/errors';

/** Plan mutations (all optimistic in src/api) wrapped with the Week screen's toasts. */
export function usePlanActions(weekStart: ISODate) {
  const add = useAddPlanItem();
  const update = useUpdatePlanItem();
  const remove = useRemovePlanItem();
  const { toast } = useToast();
  const t = useT('week');
  const errorMessage = useErrorMessage();

  const onAddError = useCallback(
    (error: unknown) =>
      toast({
        tone: 'danger',
        title: isConflict(error) ? t('toast.duplicate') : t('toast.failed'),
        description: isConflict(error) ? undefined : errorMessage(error),
      }),
    [toast, t, errorMessage],
  );
  const onError = useCallback(
    (error: unknown) =>
      toast({ tone: 'danger', title: t('toast.failed'), description: errorMessage(error) }),
    [toast, t, errorMessage],
  );

  return {
    addTasks: (tasks: readonly Task[], toastTitle?: string) => {
      for (const task of tasks) add.mutate({ weekStart, taskId: task.id }, { onError: onAddError });
      if (toastTitle) toast({ tone: 'success', title: toastTitle });
    },
    addAdHoc: (title: string) => add.mutate({ weekStart, title }, { onError: onAddError }),
    setStatus: (item: PlanItem, status: 'planned' | 'skipped') => {
      update.mutate({ id: item.id, patch: { status } }, { onError });
      toast({ title: status === 'skipped' ? t('toast.skipped') : t('toast.unskipped') });
    },
    saveDetails: (item: PlanItem, details: { assignee: string; note: string }) => {
      update.mutate(
        {
          id: item.id,
          patch: { assignee: details.assignee.trim() || null, note: details.note.trim() || null },
        },
        { onError },
      );
    },
    remove: (item: PlanItem) => {
      remove.mutate(item.id, { onError });
      toast({ title: t('toast.removed') });
    },
  };
}

export type PlanActions = ReturnType<typeof usePlanActions>;
