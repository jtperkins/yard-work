import { useCatalog, useUndoSignOff } from '../../api';
import { useLang, useT } from '../../i18n';
import type { Completion } from '../../shared/api-schemas';
import { formatDate } from '../../shared/dates';
import { ConfirmDialog, useToast } from '../../ui';
import { describeWork } from './describe';

export interface DeleteSignOffDialogProps {
  /** The sign-off to delete; the dialog is open while this is set. */
  completion: Completion | null;
  onClose: () => void;
}

/**
 * Confirms and soft-deletes a sign-off (the server keeps it with `deleted_at`/`deleted_by` and
 * puts a linked plan item back to "planned"). Signed-in users only.
 */
export function DeleteSignOffDialog({ completion, onClose }: DeleteSignOffDialogProps) {
  const t = useT('log');
  const tc = useT('common');
  const { lang } = useLang();
  const catalog = useCatalog();
  const { toast } = useToast();
  const remove = useUndoSignOff();

  const confirm = () => {
    if (!completion) return;
    remove.mutate(completion.id, {
      onSuccess: () => toast({ title: t('delete.done'), tone: 'success' }),
      onError: () => toast({ title: t('delete.failed'), tone: 'danger' }),
    });
    onClose();
  };

  return (
    <ConfirmDialog
      open={completion !== null}
      onClose={onClose}
      onConfirm={confirm}
      tone="danger"
      title={t('delete.title')}
      description={
        completion
          ? t('delete.body', {
              task: describeWork(completion, catalog, lang).title,
              date: formatDate(completion.doneOn, lang, { day: 'numeric', month: 'long' }),
              doneBy: completion.doneBy,
            })
          : undefined
      }
      confirmLabel={t('delete.confirm')}
      cancelLabel={tc('actions.cancel')}
      closeLabel={tc('actions.close')}
    />
  );
}
