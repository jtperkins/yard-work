import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { paths } from '../../app/paths';
import { useCreateTask, useTask, useUpdateTask } from '../../api';
import { useT } from '../../i18n';
import type { TaskInput } from '../../shared/api-schemas';
import { Card, EmptyState, PageHeader, SkeletonText, TextLink, useToast } from '../../ui';
import { useErrorMessage } from '../shared/errors';
import { TaskForm } from './TaskForm';

/** Routes `/tasks/new` and `/tasks/:id/edit` (both behind RequireAuth). */
export function TaskFormScreen() {
  const { id } = useParams<{ id: string }>();
  const editing = id !== undefined;
  const t = useT('tasks');
  const navigate = useNavigate();
  const { toast } = useToast();
  const errorMessage = useErrorMessage();
  const existing = useTask(id);
  const create = useCreateTask();
  const update = useUpdateTask();

  const back = (
    <TextLink
      as={Link}
      to={editing ? paths.task(id) : paths.tasks()}
      tone="muted"
      leadingIcon={ArrowLeft}
    >
      {t('detail.back')}
    </TextLink>
  );

  if (editing && !existing.data) {
    return existing.isPending ? (
      <>
        <PageHeader back={back} title={t('form.titleEdit')} />
        <SkeletonText lines={4} />
      </>
    ) : (
      <>
        <PageHeader back={back} title={t('detail.notFoundTitle')} />
        <Card padding="lg">
          <EmptyState title={t('detail.notFoundBody')} />
        </Card>
      </>
    );
  }

  const failed = (error: unknown) =>
    toast({ tone: 'danger', title: t('form.failed'), description: errorMessage(error) });

  const submit = (input: TaskInput) => {
    if (editing) {
      update.mutate(
        { id, patch: input },
        {
          onSuccess: (task) => {
            toast({ tone: 'success', title: t('form.saved') });
            void navigate(paths.task(task.id));
          },
          onError: failed,
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: (task) => {
          toast({ tone: 'success', title: t('form.created') });
          void navigate(paths.task(task.id));
        },
        onError: failed,
      });
    }
  };

  return (
    <>
      <PageHeader back={back} title={t(editing ? 'form.titleEdit' : 'form.titleNew')} />
      <TaskForm
        initial={existing.data}
        submitLabel={t(editing ? 'form.save' : 'form.create')}
        submitting={create.isPending || update.isPending}
        onSubmit={submit}
        onCancel={() => void navigate(editing ? paths.task(id) : paths.tasks())}
      />
    </>
  );
}
